#!/bin/bash

# Mount data
sudo mkfs.ext4 /dev/nvme1n1
sudo mount /dev/nvme1n1 /data
df -h

source /home/ubuntu/.profile
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

# Load environment variables that came from terraform variables
export $(cat env_vars.txt)
# Clean up the file
shred -zvu -n  5 env_vars.txt

export LDLOGSSL=false
export INGESTION_HOST=127.0.0.1
export LOGDNA_HOST=$INGESTION_HOST
export DEFAULT_LOG_PATH=/data/test-logs
export LOGDNA_LOG_DIRS=$DEFAULT_LOG_PATH
export LOGDNA_AGENT_KEY=123
export LOGDNA_INGESTION_KEY=$LOGDNA_AGENT_KEY
export LOGDNA_EXCLUSION_RULES="/var/log/**"
export LOGDNA_LOOKBACK=start
export RESOLUTION_TIME_SERIES=10

# TODO: Move this settings to a "profile" or a group of settings
export RUN_TIME_IN_SECONDS=120
export MAX_CHUNK_SIZE_KB=16
export DELAY_APPEND_MS=5
export TOTAL_FILES=20

nvm ls
node --version
rustc --version

chmod 400 /home/ubuntu/.ssh/id_rsa
ssh-keyscan github.com >> /home/ubuntu/.ssh/known_hosts

# Generate keys for ingester
openssl req -nodes -new -x509 -keyout self-signed-server.key -out self-signed-server.cert -subj "/C=US/ST=CA/L=SF/O=LOGDNA/OU=ENGINEERING/CN=www.logdna.com/emailAddress=info@logdna.com"

# Clone agent-linux
git clone -q git@github.com:logdna/agent-linux.git

# Rust agent repository was already cloned, update remote branches
cd logdna-agent-v2 || exit
git fetch --all
cd

install() {
  local name=${1}
  local agent_type=${2}
  local branch=${3}
  local cmd=""
  echo "Installing $name, type: $agent_type, branch: $branch"

  if [ "$agent_type" == "rust" ]
  then
    sudo cp -a logdna-agent-v2 "/data/${name}"
    cmd="cargo build --release"
  else
    sudo cp -a agent-linux "/data/${name}"
    cmd="npm install --no-progress "
  fi

  ln -s "/data/${name}" "${name}"
  cd "${name}" || exit 1
  git checkout -b "${name}" "origin/${branch}"
  eval "$cmd"
  cd
}

install "baseline" "$BASELINE_AGENT_TYPE" "$BASELINE_AGENT_BRANCH"

if [ "$COMPARE_AGENT_TYPE" != "" ]
then
  install "compare" "$COMPARE_AGENT_TYPE" "$COMPARE_AGENT_BRANCH"
fi

git clone -q git@github.com:logdna/agent-benchmarks.git
cd agent-benchmarks/src/monitoring || exit 1
npm install --no-progress

# Start the benchmark
sudo -E "${NVM_BIN}/node" --unhandled-rejections=strict index.js

cd

# Generate charts
sudo mkdir ~/results/charts/
GNUPLOT_PARAMS="BASIC=1"

if [ "$COMPARE_AGENT_TYPE" != "" ]
then
  GNUPLOT_PARAMS="${GNUPLOT_PARAMS};INCLUDE_COMPARE=1"
fi

echo "Plotting charts"
sudo gnuplot -e $GNUPLOT_PARAMS agent-benchmarks/src/charts/memory-series.gnuplot

# Save to S3
if [ "$AWS_ACCESS_KEY_ID" != "" ]
then
  DEFAULT_BUCKET="agent-benchmarks-$(date +%s)"
  BUCKET="${BUCKET:-$DEFAULT_BUCKET}"
  echo "Saving results to s3://${BUCKET}"
  aws s3 mb "s3://${BUCKET}"
  aws s3 cp ~/results/charts/memory-series.png "s3://${BUCKET}"
  aws s3 cp ~/results/benchmarks "s3://${BUCKET}/benchmarks" --recursive
fi
