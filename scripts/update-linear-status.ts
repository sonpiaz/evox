import { LinearClient } from "@linear/sdk";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const ISSUE_IDENTIFIER = process.env.ISSUE_ID || "AGT-90";
const STATUS_NAME = process.env.STATUS || "Done";

async function updateStatus() {
  if (!LINEAR_API_KEY) {
    throw new Error("LINEAR_API_KEY environment variable is required");
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

    // Get the team to find the correct state
    const team = await issue.team;
    if (!team) {
      throw new Error("Could not find team for issue");
    }

    const states = await team.states();
    const stateNodes = await states.nodes;

    const targetState = stateNodes.find(
      (state) => state.name.toLowerCase() === STATUS_NAME.toLowerCase()
    );

    if (!targetState) {
      console.log("Available states:", stateNodes.map(s => s.name).join(", "));
      throw new Error(`State "${STATUS_NAME}" not found`);
    }

    // Update the issue state
    const updatePayload = await client.updateIssue(issue.id, {
      stateId: targetState.id,
    });

    const success = await updatePayload.success;

    if (success) {
      console.log(`✅ Issue ${ISSUE_IDENTIFIER} updated to "${STATUS_NAME}"`);
      console.log(`Issue URL: ${issue.url}`);
    } else {
      throw new Error("Failed to update issue");
    }
  } catch (error) {
    console.error("❌ Failed to update status:", error);
    throw error;
  }
}

updateStatus();
