const fs = require('fs-extra')

async function copyFoldersToFrontEnd(src, dest) {
    if (fs.existsSync(dest)) {
        try {
            await fs.remove(dest)
            console.log('Outdated frontend folder deleted!')
        } catch (err) {
            console.error(err)
        }
    }
    await fs.copy(src, dest)
        .then(() => console.log('Frontend updated!'))
        .catch(err => console.error(err));
}

task("update_frontend", "Copies ./build to ../frontend/src/build")
    .setAction(async () => {
        await copyFoldersToFrontEnd("./build", "../frontend/src/build")
    })

module.exports = {};