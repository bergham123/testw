export async function onRequestPost({ request, env }) {
    try {
        // Read the secure environment variables from Cloudflare
        const GITHUB_TOKEN = env.GITHUB_TOKEN;
        const OWNER = env.GITHUB_OWNER;
        const REPO = env.GITHUB_REPO;
        const WORKFLOW_ID = env.GITHUB_WORKFLOW;
        const FILE_PATH = 'message.txt'; // File to save data in
        const BRANCH = 'main';           // Branch to commit to

        if (!GITHUB_TOKEN || !OWNER || !REPO) {
            return new Response(JSON.stringify({ error: "Server missing environment variables" }), { status: 500 });
        }

        const data = await request.json();

        // ---------------------------------------------------------
        // ACTION: SAVE FILE
        // ---------------------------------------------------------
        if (data.action === 'save') {
            
            // Step A: Get the current file SHA (to overwrite it)
            let sha = null;
            const getFileRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
                method: 'GET',
                headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
            });

            if (getFileRes.ok) {
                const fileData = await getFileRes.json();
                sha = fileData.sha;
            }

            // Step B: Update or Create the file
            const updateRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: `Update data via Web UI`,
                    content: data.content,
                    sha: sha,
                    branch: BRANCH
                })
            });

            if (!updateRes.ok) {
                const errData = await updateRes.json();
                return new Response(JSON.stringify({ error: errData.message }), { status: updateRes.status });
            }

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        // ---------------------------------------------------------
        // ACTION: RUN WORKFLOW
        // ---------------------------------------------------------
        else if (data.action === 'run') {
            const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    ref: BRANCH
                })
            });

            if (res.status === 204) {
                return new Response(null, { status: 204 }); // Success
            } else {
                const errData = await res.json();
                return new Response(JSON.stringify({ error: errData.message }), { status: res.status });
            }
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
