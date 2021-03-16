#!/bin/bash

# Mount EBS volume on /data
sudo mkdir /data
sudo mount /dev/nvme1n1 /data

sudo apt-get update -y -qq
sudo apt install -y -qq build-essential pkg-config libssh-dev cmake libsystemd-dev gnuplot awscli llvm clang

# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.1/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

# Install Node.js
nvm install 12
node --version

# Install rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env
rustc --version

# Install cargo make
cargo install --force cargo-make

# Download and build the rust agent at master branch to speed up future builds
git clone https://github.com/logdna/logdna-agent-v2.git
cd logdna-agent-v2 || exit 1
cargo build --release
