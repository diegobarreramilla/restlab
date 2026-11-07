const { APP_NAME, logoMarkSvg } = require('../branding');

module.exports = function aboutBruno({ version }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1, user-scalable=yes">
        <title>About ${APP_NAME}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                text-align: center;
                margin: 0;
                padding: 10px;
                background-color: #f4f4f4;
                color: #333;
            }
            .logo {
                margin-top: 0px;
                color: #222;
            }
            .title {
                font-size: 24px;
                margin-top: 5px;
                font-weight: bold;
                color: #222;
            }
            .footer {
                margin-top: 5px;
                padding: 5px;
                font-size: 12px;
                line-height: 1.5;
                color: #555;
            }
        </style>
    </head>
    <body>
      <div class="logo">
        ${logoMarkSvg(100)}
      </div>
      <h2 class="title">${APP_NAME} ${version}</h2>
      <footer class="footer">
          <div>${APP_NAME} is based on Bruno.</div>
          <div>MIT License. Copyright &copy; 2022 Anoop M D, Anusree P S and Contributors.</div>
      </footer>
    </body>
    </html>
  `;
};
