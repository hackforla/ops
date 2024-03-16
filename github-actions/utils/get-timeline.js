/**
 * Function that returns the issue's timeline of events.
 * https://octokit.github.io/rest.js/v20#issues-list-events-for-timeline
 * @param {number} issue_number
 * @returns {Array} of Objects containing the issue's timeline of events
 */
async function getTimeline(issue_number, github, context) {
  const { owner, repo } = context.repo;
  let timelineArr = [];
  let page = 1;
  const per_page = 100;

  while (true) {
    try {
      const { data } = await github.rest.issues.listEventsForTimeline({
        owner,
        repo,
        issue_number,
        per_page,
        page,
      });
      if (data.length) {
        timelineArr = timelineArr.concat(data);
      } else {
        break;
      }
    } catch (err) {
      console.error(err);
      continue;
    }
    finally {
      page++;
    }
  }
  return timelineArr;
}

module.exports = getTimeline;