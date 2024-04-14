// 设置默认的 token
let defaultToken = '@yixiu';

// 导出 Cloudflare Worker
export default {
    // 请求处理函数
    async fetch(request, env) {
        // 获取环境变量中的 token，若不存在则使用默认 token
        defaultToken = env.TOKEN || defaultToken;

        let kvNamespace;
        // 检查环境变量中是否有 KV 命名空间
        if (env.KV) {
            kvNamespace = env.KV;
        } else {
            // 若不存在 KV 命名空间，则返回 400 错误
            return new Response('KV 命名空间未绑定', {
                status: 400,
                headers: { 'content-type': 'text/plain; charset=utf-8' },
            });
        }

        // 解析请求的 URL
        const url = new URL(request.url);
        let token;
        // 如果请求路径与默认 token 相符，则使用默认 token
        if (url.pathname === `/${defaultToken}`) {
            token = defaultToken;
        } else {
            // 否则从 URL 参数中获取 token
            token = url.searchParams.get('token') || "null";
        }

        // 如果 token 有效
        if (token === defaultToken) {

            // 处理文件上传请求
            if (url.pathname === "/upload" && request.method === "POST") {
                // 解析表单数据
                const formData = await request.formData();
                const file = formData.get('file');
                const encryption = formData.get('encryption');
                if (!file) {
                    // 若未上传文件，则返回 400 错误
                    return new Response('未上传文件', { status: 400 });
                }
                // 读取文件内容
                const arrayBuffer = await file.arrayBuffer();
                let fileContent = arrayBuffer;
                // 若选择了密文加密，则对文件内容进行 base64 编码
                if(encryption == "ciphertext"){
                     fileContent = base64Encode(arrayBuffer);
                }
                // 检查文件是否已存在于 KV 存储中
                await checkFileExists(kvNamespace, file.name);

                try {
                    // 将文件内容存储到 KV 存储中
                    await kvNamespace.put(file.name, fileContent);
                    return new Response('文件上传成功');
                } catch (error) {
                    // 处理文件上传异常
                    console.error('文件上传时出现异常：', error);
                    return new Response(error, { status: 500 });
                }
            }

            // 处理配置页面请求
            const filename = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
            
            if (filename == "config" || filename == defaultToken) {
                // 生成配置页面的 HTML
                const html = generateConfigHTML(url.hostname, token);
                return new Response(html, {
                    headers: {
                        'Content-Type': 'text/html; charset=UTF-8',
                    },
                });
            } else {
                // 若请求的文件存在于 KV 存储中，则返回文件内容
                const value = await kvNamespace.get(filename);
                    return new Response(value , {
                        status: 200,
                        headers: { 'content-type': 'text/plain; charset=utf-8' },
                    });
            }

        } else if (url.pathname == "/"){
            // 处理根路径请求，返回欢迎页面
            return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                <title>Welcome to nginx!</title>
                <style>
                    body {
                        width: 35em;
                        margin: 0 auto;
                        font-family: Tahoma, Verdana, Arial, sans-serif;
                    }
                </style>
                </head>
                <body>
                <h1>Welcome to nginx!</h1>
                <p>If you see this page, the nginx web server is successfully installed and
                working. Further configuration is required.</p>
                
                <p>For online documentation and support please refer to
                <a href="http://nginx.org/">nginx.org</a>.<br/>
                Commercial support is available at
                <a href="http://nginx.com/">nginx.com</a>.</p>
                
                <p><em>Thank you for using nginx.</em></p>
                </body>
                </html>
                `, {
                headers: {
                    'Content-Type': 'text/html; charset=UTF-8',
                },
            });
        } else {
            // 处理无效 token 请求
            return new Response('token 有误', {
                status: 400,
                headers: { 'content-type': 'text/plain; charset=utf-8' },
            });
        }
    }
};

// 检查文件是否已存在于 KV 存储中
async function checkFileExists(kvNamespace, filename) {
    const value = await kvNamespace.get(filename);
    return value !== null;
}

// 对 ArrayBuffer 进行 base64 编码
function base64Encode(buffer) {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode.apply(null, bytes));
}

// 对 base64 字符串进行解码
function base64Decode(str) {
    const bytes = new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
}

// 生成配置页面的 HTML
function generateConfigHTML(domain, token) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CF-Workers-TEXT-KV</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0 auto;
                    padding: 20px;
                    max-width: 800px;
                    background-color: #f4f4f4;
                }
                h1 {
                    text-align: center;
                    color: #333;
                }
                .centered {
                    text-align: center;
                }
                input[type="text"],
                input[type="file"] {
                    width: calc(100% - 22px);
                    padding: 10px;
                    margin-bottom: 10px;
                    border: 1px solid #ccc;
                    border-radius: 5px;
                }
                button[type="button"] {
                    display: block;
                    width: calc(100% - 22px);
                    padding: 8px;
                    background-color: #007bff;
                    color: #fff;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-bottom: 10px;
                }
                button[type="button"]:hover {
                    background-color: #0056b3;
                }
                pre {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    background-color: #eee;
                    padding: 10px;
                    border-radius: 5px;
                }
                label {
                    margin-right: 10px;
                }
            </style>
        </head>
        <body>
            <h1>CF-Workers-TEXT-KV 配置信息</h1>
            <p class="centered">
                服务域名: ${domain} <br>
                token: ${token} <br>
                <br>
                <form id="uploadForm" enctype="multipart/form-data">
                    <input type="file" name="file" id="file" required>
                    <br>
                    <label><input type="radio" name="encryption" value="plaintext" checked> 明文</label>
                    <label><input type="radio" name="encryption" value="ciphertext"> 密文</label>
                    <br>
                    <button type="button" onclick="uploadFile()">上传文件</button>
                </form>
                <pre>注意! 因 URL 长度内容所限，脚本更新方式一次最多更新65行内容</pre><br>

                <div class="document-search">
                    在线文档查询: <br>
                    <input type="text" name="keyword" placeholder="请输入要查询的文档">    
                    <button type="button" onclick="window.open('https://${domain}/' + document.querySelector('input[name=keyword]').value + '?token=${token}', '_blank')">查看文档内容</button>
                    <button type="button" onclick="navigator.clipboard.writeText('https://${domain}/' + document.querySelector('input[name=keyword]').value + '?token=${token}')">复制文档地址</button>
                </div>
            </p>
        <script>
            // 文件上传函数
            async function uploadFile() {
                const fileInput = document.getElementById('file');
                const file = fileInput.files[0];
                const formData = new FormData();
                formData.append('file', file);
                formData.append('encryption', document.querySelector('input[name="encryption"]:checked').value);
                
                // 发送文件上传请求
                const response = await fetch('/upload?token=${token}', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    console.log(response);
                    console.log('文件上传成功');
                } else {
                    console.error('文件上传失败');
                }
            }
        </script>
        </body>
        </html>
    `;
}
