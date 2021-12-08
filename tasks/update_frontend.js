const fs = require('fs')
const fsExtra = require('fs-extra');

async function copyFoldersToFrontEnd(src, dest) {
    if (fs.existsSync(dest)) {
        try {
            await fsExtra.remove(dest)
            console.log('Outdated frontend folder deleted!')
        } catch (err) {
            console.error(err)
        }
    }
    await fsExtra.copy(src, dest)
        .then(() => console.log('Frontend updated!'))
        .catch(err => console.error(err));
}

task("update_frontend", "Copies ./artifacts to ../frontend/src/build")
    .setAction(async () => {
        await copyFoldersToFrontEnd("./artifacts", "../frontend/src/build")
    })

module.exports = {};