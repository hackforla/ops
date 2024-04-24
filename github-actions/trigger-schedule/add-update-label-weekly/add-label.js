// Import modules
const findLinkedIssue = require('../../utils/find-linked-issue');
const getTimeline = require('../../utils/get-timeline');
var fs = require("fs");
// Global variables
var github;
var context;
const statusUpdatedLabel = 'Status: Updated';
const toUpdateLabel = 'To Update !';
const inactiveLabel = '2 weeks inactive';
const updatedByDays = 3; // If there is an update within 3 days, the issue is considered updated
const inactiveUpdatedByDays = 14; // If no update within 14 days, the issue is considered '2 weeks inactive'
const commentByDays = 7; // If there is an update within 14 days but no update within 7 days, the issue is considered outdated and the assignee needs 'To Update !' it
const threeDayCutoffTime = new Date()
threeDayCutoffTime.setDate(threeDayCutoffTime.getDate() - updatedByDays)
const sevenDayCutoffTime = new Date()
sevenDayCutoffTime.setDate(sevenDayCutoffTime.getDate() - commentByDays)
const fourteenDayCutoffTime = new Date()
fourteenDayCutoffTime.setDate(fourteenDayCutoffTime.getDate() - inactiveUpdatedByDays)

/**
 * The main function retrieves issues from a specific column in a specific project and examines the timeline of each issue for staleness.
 * An update to an issue is either (1) a comment by the assignee, or (2) a user assignment to the issue. 
 * If the last update is not within 7 days or 14 days, apply the appropriate "to update" label, and request an update.
 * However, if the assignee has submitted a PR that fixed the issue regardless of when, all update-related labels should be removed.

 * @param {Object} g github object from actions/github-script
 * @param {Object} c context object from actions/github-script
 * @param {Number} columnId a number representing the specific column to examine, supplied by GitHub secrets
 */
async function main({ g, c }, columnId) {
  github = g;
  context = c;
  // Retrieve all issue numbers from a column
  const issueNums = getIssueNumsFromColumn(columnId);
  for await (const issueNum of issueNums) {
    console.log("🚀 ~ main ~ issueNums:", issueNum)
    const timeline = await getTimeline(issueNum, github, context);
    const assignees = await getAssignees(issueNum);
    // Error handling
    if (assignees.length === 0) {
      console.error(`Assignee not found, skipping issue #${issueNum}`);
      continue;
    }

    // Add, remove labels, and post comment if the issue's timeline indicates the issue is inactive, needs an update, or is current.
    const responseObject = await isTimelineOutdated(timeline, issueNum, assignees)

    if (responseObject.result === true && responseObject.labels === toUpdateLabel) { // 7-day outdated, add 'To Update !' label
      console.log(`Going to ask for an update now for issue #${issueNum}`);
      await removeLabels(issueNum, statusUpdatedLabel, inactiveLabel);
      await addLabels(issueNum, responseObject.labels);
      await postComment(issueNum, assignees, toUpdateLabel);
    }
    if (responseObject.result === true && responseObject.labels === inactiveLabel) { // 14-day outdated, add '2 Weeks Inactive' label
      console.log(`Going to ask for an update now for issue #${issueNum}`);
      await removeLabels(issueNum, toUpdateLabel, statusUpdatedLabel);
      await addLabels(issueNum, responseObject.labels);
      await postComment(issueNum, assignees, inactiveLabel);
    } else if (responseObject.result === false && responseObject.labels === statusUpdatedLabel) { // Updated within 3 days, retain 'Status: Updated' label if there is one
      console.log(`Updated within 3 days, retain updated label for issue #${issueNum}`);
      await removeLabels(issueNum, toUpdateLabel, inactiveLabel);
    } else if (responseObject.result === false && responseObject.labels === '') { // Updated between 3 and 7 days, or recently assigned, or fixed by a PR by assignee, remove all three update-related labels
      console.log(`No updates needed for issue #${issueNum}, will remove all labels`);
      await removeLabels(issueNum, toUpdateLabel, inactiveLabel, statusUpdatedLabel);
    }
  }
}

/**
 * Generator that returns issue numbers from cards in a column.
 * @param {Number} columnId the id of the column in GitHub's database
 * @returns {Array} of issue numbers
 */
async function* getIssueNumsFromColumn(columnId) {
  if (!columnId) console.error(`column id "${columnId}" is falsy.`);

  let page = 1;
  while (page < 100) {
    try {
      const results = await github.rest.projects.listCards({
        column_id: columnId,
        per_page: 100,
        page: page
      });
      console.log("🚀 ~ function*getIssueNumsFromColumn ~ results:", results)
      if (results.data.length) {
        for (let card of results.data) {
          if (card.hasOwnProperty('content_url')) {
            const arr = card.content_url.split('/');
            console.log("🚀 ~ function*getIssueNumsFromColumn ~ arr:", arr)
            yield arr.pop()
          }
        }
      } else {
        return
      }
    } catch {
      continue
    } finally {
      page++;
    }
  }
}

/**
 * Assesses whether the timeline is outdated.
 * @param {Array} timeline a list of events in the timeline of an issue, retrieved from the issues API
 * @param {Number} issueNum the issue's number
 * @param {String} assignees a list of the issue's assignee's login username
 * @returns {Object} { result, labels } 
 * - result: a boolean if timeline indicates the issue is outdated/inactive.
 * - labels: a string label that should be removed, retained or added to the issue.
 */
function isTimelineOutdated(timeline, issueNum, assignees) {
  let lastAssignedTimestamp = null;
  let lastCommentTimestamp = null;

  for (let i = timeline.length - 1; i >= 0; i--) {
    const eventObj = timeline[i];
    const eventType = eventObj.event;

    const isCrossReferencedEvent = eventType === 'cross-referenced';
    // Checks if the 'body' (comment) of the event mentions fixes/resolves/closes this current issue.
    const isLinkedIssue = isCrossReferencedEvent ? findLinkedIssue(eventObj.source.issue.body) == issueNum : false;
    // If cross-referenced and fixed/resolved/closed by assignee and the pull request is open, remove all update-related labels.
    const isOpenLinkedPullRequest = isCrossReferencedEvent && isLinkedIssue && eventObj.source.issue.state === 'open';

    if (isOpenLinkedPullRequest) {
      // Once a PR is opened, we remove labels because we focus on the PR not the issue.
      if (isOpenLinkedPullRequest && assignees.includes(eventObj.actor.login)) {
        console.log(`Assignee fixes/resolves/closes Issue #${issueNum} in with an open pull request, remove all update-related labels`);
        return { result: false, labels: '' } // Remove all three labels
      }
    }

    // If the event is a linked PR and the PR is closed, continue the conditional checks to return the appropriate { result, labels }.
    if (isCrossReferencedEvent && eventObj.source.issue.state === 'closed') {
      console.log(`Pull request linked to Issue #${issueNum} is closed.`);
    }

    let eventTimestamp = eventObj.updated_at || eventObj.created_at;

    // Update the lastCommentTimestamp if this is the last (most recent) comment by an assignee.
    if (!lastCommentTimestamp && eventType === 'commented' && assignees.includes(eventObj.actor.login)) {
      lastCommentTimestamp = eventTimestamp;
    }

    // Update the lastAssignedTimestamp if this is the last (most recent) time an assignee was assigned to the issue
    if (!lastAssignedTimestamp && eventType === 'assigned' && assignees.includes(eventObj.assignee.login)) {
      lastAssignedTimestamp = eventTimestamp;
    }
  }

  if (lastCommentTimestamp && isMomentRecent(lastCommentTimestamp, threeDayCutoffTime)) { // if commented by assignee within 3 days
    console.log(`Issue #${issueNum} commented by assignee within 3 days, retain 'Status: Updated' label`);
    return { result: false, labels: statusUpdatedLabel } // Retain (don't add) updated label, remove the other two
  }

  if (lastAssignedTimestamp && isMomentRecent(lastAssignedTimestamp, threeDayCutoffTime)) { // if an assignee was assigned within 3 days
    console.log(`Issue #${issueNum} assigned to assignee within 3 days, no update-related labels should be used`);
    return { result: false, labels: '' } // Remove all three labels
  }

  if ((lastCommentTimestamp && isMomentRecent(lastCommentTimestamp, sevenDayCutoffTime)) || (lastAssignedTimestamp && isMomentRecent(lastAssignedTimestamp, sevenDayCutoffTime))) { // if updated within 7 days
    if ((lastCommentTimestamp && isMomentRecent(lastCommentTimestamp, sevenDayCutoffTime))) {
      console.log(`Issue #${issueNum} commented by assignee between 3 and 7 days, no update-related labels should be used; timestamp: ${lastCommentTimestamp}`)
    } else if (lastAssignedTimestamp && isMomentRecent(lastAssignedTimestamp, sevenDayCutoffTime)) {
      console.log(`Issue #${issueNum} assigned between 3 and 7 days, no update-related labels should be used; timestamp: ${lastAssignedTimestamp}`)
    }
    return { result: false, labels: '' } // Remove all three labels
  }

  // If last comment was between 7-14 days, or no comment but an assignee was assigned during this period, issue is outdated and add 'To Update !' label
  if ((lastCommentTimestamp && isMomentRecent(lastCommentTimestamp, fourteenDayCutoffTime)) || (lastAssignedTimestamp && isMomentRecent(lastAssignedTimestamp, fourteenDayCutoffTime))) {
    if ((lastCommentTimestamp && isMomentRecent(lastCommentTimestamp, fourteenDayCutoffTime))) {
      console.log(`Issue #${issueNum} commented by assignee between 7 and 14 days, use 'To Update !' label; timestamp: ${lastCommentTimestamp}`)
    } else if (lastAssignedTimestamp && isMomentRecent(lastAssignedTimestamp, fourteenDayCutoffTime)) {
      console.log(`Issue #${issueNum} assigned between 7 and 14 days, use 'To Update !' label; timestamp: ${lastAssignedTimestamp}`)
    }
    return { result: true, labels: toUpdateLabel } // outdated, add 'To Update!' label
  }

  // If no comment or assigning found within 14 days, issue is outdated and add '2 weeks inactive' label
  console.log(`Issue #${issueNum} has no update within 14 days, use '2 weeks inactive' label`)
  return { result: true, labels: inactiveLabel }
}

/**
 * Removes labels from a specified issue
 * @param {Number} issueNum an issue's number
 * @param {Array} labels an array containing the labels to remove (captures the rest of the parameters)
 */
async function removeLabels(issueNum, ...labels) {
  for (let label of labels) {
    try {
      // https://octokit.github.io/rest.js/v18#issues-remove-label
      const response = await github.rest.issues.removeLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNum,
        name: label,
      });
      console.log(`Removed "${label}" from issue #${issueNum}`);
      console.log(`Remaining labels: "${response}"`);
    } catch (err) {
      const { message } = err;
      if (err.status === 404) console.log({ status: 404, message, label })
      else console.error(`Function failed to remove labels. Please refer to the error below: \n `, err);
    }
  }
}

/**
 * Adds labels to a specified issue
 * @param {Number} issueNum an issue's number
 * @param {Array} labels an array containing the labels to add (captures the rest of the parameters)
 */

async function addLabels(issueNum, ...labels) {
  try {
    // https://octokit.github.io/rest.js/v18#issues-add-labels
    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNum,
      labels: labels,
    });
    console.log(`Added these labels to issue #${issueNum}: ${labels}`);
    // If an error is found, the rest of the script does not stop.
  } catch (err) {
    console.error(`Function failed to add labels. Please refer to the error below: \n `, err);
  }
}

async function postComment(issueNum, assignees, labelString) {
  try {
    const assigneeString = assignees.map(assignee => `@${assignee}`).join(', '); // createAssigneesString
    const instructions = formatComment(assigneeString, labelString);
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNum,
      body: instructions,
    });
  } catch (err) {
    console.error(`Function failed to post comments. Please refer to the error below: \n `, err);
  }
}

/***********************
*** HELPER FUNCTIONS ***
***********************/
function isMomentRecent(dateString, cutoffTime) {
  const dateStringObj = new Date(dateString);

  if (dateStringObj >= cutoffTime) return true
  else return false
}
async function getAssignees(issueNum) {
  try {
    const results = await github.rest.issues.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNum,
    });
    const assigneesData = results.data.assignees;
    assigneesLogins = assigneesData.map(item => item.login); // filter for assignees logins
    return assigneesLogins
  } catch (err) {
    console.error(`Function failed to get assignees. Please refer to the error below: \n `, err);
    return null
  }
}
function formatComment(assignees, labelString) {
  const path = './github-actions/trigger-schedule/add-update-label-weekly/update-instructions-template.md'
  const text = fs.readFileSync(path).toString('utf-8');
  const options = {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Los_Angeles',
  }
  const cutoffTimeString = threeDayCutoffTime.toLocaleString('en-US', options);
  let completedInstructions = text.replace('${assignees}', assignees).replace('${cutoffTime}', cutoffTimeString).replace('${label}', labelString);
  return completedInstructions
}

module.exports = main