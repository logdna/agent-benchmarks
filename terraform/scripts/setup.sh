#!/bin/bash

source /home/ubuntu/.profile
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

# Load environment variables that came from terraform variables
export $(cat env_vars.txt)
echo "Agent branch is ${AGENT_BRANCH}"

nvm ls
node --version
rustc --version

chmod 400 /home/ubuntu/.ssh/id_rsa
ssh-keyscan github.com >> /home/ubuntu/.ssh/known_hosts

git clone git@github.com:logdna/logdna-agent-v2.git
cd logdna-agent-v2 || exit 1
git checkout ${AGENT_BRANCH}
cargo build --release

cd ..

git clone git@github.com:answerbook/mock-ingester.git
cd mock-ingester || exit 1

