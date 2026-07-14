export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const GITHUB_TOKEN = env.GITHUB_TOKEN;
        const OWNER = env.GITHUB_OWNER;
        const REPO = env.GITHUB_REPO;
        const WORKFLOW_ID = env.GITHUB_WORKFLOW;
        const FILE_PATH = 'message.txt';
        const BRANCH = 'main';

        if (!GITHUB_TOKEN || !OWNER || !REPO || !WORKFLOW_ID) {
            return new Response(JSON.stringify({ error: "Server missing environment variables. Check Cloudflare Settings." }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const data = await request.json();

        // ACTION: SAVE FILE
        if (data.action === 'save') {
            let sha = null;
            const getFileRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
                method: 'GET',
                headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
            });

            if (getFileRes.ok) {
                const fileData = await getFileRes.json();
                sha = fileData.sha;
            }

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
                const errData = await updateRes.json().catch(() => ({}));
                return new Response(JSON.stringify({ error: errData.message || "GitHub API Error on Save" }), { 
                    status: updateRes.status, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }

            return new Response(JSON.stringify({ success: true }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // ACTION: RUN WORKFLOW
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
                return new Response(null, { status: 204 });
            } else {
                const errData = await res.json().catch(() => ({}));
                return new Response(JSON.stringify({ error: errData.message || "GitHub API Error on Run" }), { 
                    status: res.status, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }
        }

        return new Response(JSON.stringify({ error: "Invalid action specified" }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Internal Function Error: " + error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}
