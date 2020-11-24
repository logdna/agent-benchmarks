variable region1 {
  default = "us-east-2"
}

provider aws {
  region = var.region1
  version = "~> 3"
}

data aws_ami ami_main {
  most_recent = true
  owners = ["self"]
  filter {
    name = "name"
    values = ["agent-benchmarks-image*"]
  }
}

resource aws_instance client_r1 {
  ami = data.aws_ami.ami_main.id
  instance_type = "m5d.large"
  associate_public_ip_address = true
  tags = {
    Name = "Agent Benchmarks - Instance",
    Purpose = "Performance testing the agents"
  }
}
