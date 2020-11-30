#!/bin/bash

source /home/ubuntu/.profile
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

# Load environment variables that came from terraform variables
export $(cat env_vars.txt)
export SAVE_TO_S3=true
export LDLOGSSL=false
export INGESTION_HOST=127.0.0.1
echo "Agent branch is ${AGENT_BRANCH}"

nvm ls
node --version
rustc --version

chmod 400 /home/ubuntu/.ssh/id_rsa
ssh-keyscan github.com >> /home/ubuntu/.ssh/known_hosts

# Generate keys for ingester
openssl req -nodes -new -x509 -keyout self-signed-server.key -out self-signed-server.cert -subj "/C=US/ST=CA/L=SF/O=LOGDNA/OU=ENGINEERING/CN=www.logdna.com/emailAddress=info@logdna.com"

# Rust agent repository was already downloaded
cd logdna-agent-v2 || exit 1
git checkout ${AGENT_BRANCH}
cargo build --release

cd ..

git clone -q git@github.com:logdna/agent-linux.git
cd agent-linux || exit 1
npm install

cd ..

git clone -q git@github.com:logdna/agent-benchmarks.git
cd agent-benchmarks/src/monitoring || exit 1
npm install
