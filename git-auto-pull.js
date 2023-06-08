const { execSync } = require('child_process')

const update = () => {
  execSync('git pull', {
    stdio: 'inherit'
  })
}

setInterval(update, 5000)
update()
