/**
 * Function that returns the issue's timeline of events.
 * https://octokit.github.io/rest.js/v20#issues-list-events-for-timeline
 * @param {number} issue_number
 * @returns {Array} of Objects containing the issue's timeline of events
 */
async function getTimeline(issue_number, github, context) {
  const { owner, repo } = context.repo;
  let timelineArr = [];
  let page = 1, retries = 0;
  const per_page = 100, maxRetries = 3;

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
        page++;
      } else {
        break;
      }
    } catch (err) {
      if (err instanceof TypeError) throw new Error(err);
      if (retries < maxRetries) {
        const delay = Math.pow(2, retries);
        console.log(`Retrying in ${delay} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
        retries++;
      } else {
        console.error(err);
        throw new Error(`Failed to fetch timeline for issue #${issue_number}`);
      }
    }
  }
  return timelineArr;
}

module.exports = getTimeline;