import { LinearClient } from "@linear/sdk";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const ISSUE_IDENTIFIER = process.env.ISSUE_ID || "AGT-89";
const COMMENT_BODY = process.env.COMMENT_BODY || "";

async function postComment() {
  if (!LINEAR_API_KEY) {
    throw new Error("LINEAR_API_KEY environment variable is required");
  }

  if (!COMMENT_BODY) {
    throw new Error("COMMENT_BODY environment variable is required");
  }

  const client = new LinearClient({ apiKey: LINEAR_API_KEY });

  try {
    // Find the issue by identifier
    const issues = await client.issues({
      filter: {
        number: { eq: parseInt(ISSUE_IDENTIFIER.split("-")[1]) },
      },
    });

    const issueNodes = await issues.nodes;

    if (issueNodes.length === 0) {
      throw new Error(`Issue ${ISSUE_IDENTIFIER} not found`);
    }

    const issue = issueNodes[0];

    // Create comment
    const commentPayload = await client.createComment({
      issueId: issue.id,
      body: COMMENT_BODY,
    });

    const comment = await commentPayload.comment;

    if (comment) {
      console.log(`✅ Comment posted successfully to ${ISSUE_IDENTIFIER}`);
      console.log(`Comment ID: ${comment.id}`);
      console.log(`Comment URL: ${issue.url}#comment-${comment.id}`);
    } else {
      throw new Error("Failed to create comment");
    }
  } catch (error) {
    console.error("❌ Failed to post comment:", error);
    throw error;
  }
}

postComment();
