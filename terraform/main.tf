provider aws {
  region = var.region1
  version = "~> 3"
}

provider tls {
  version = "~> 2.0"
}

data aws_availability_zones r1 {}

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
  subnet_id = aws_subnet.r1_az1.id
  vpc_security_group_ids = [
    aws_security_group.sg_default_r1.id,
    # This security group is allowed while developing.
    # We should remove it in the final version
    aws_security_group.sg_bastion_r1.id]
  associate_public_ip_address = true
  key_name = aws_key_pair.key_r1.key_name
  tags = {
    Name = "Agent Benchmarks - Instance",
    Purpose = var.purpose
  }

  provisioner "file" {
    connection {
      type = "ssh"
      host = self.public_ip
      user = "ubuntu"
      private_key = tls_private_key.dev.private_key_pem
    }

    source      = var.path_to_ssh_key
    destination = "/home/ubuntu/.ssh/id_rsa"
  }

  provisioner "remote-exec" {
    connection {
      type = "ssh"
      host = self.public_ip
      user = "ubuntu"
      private_key = tls_private_key.dev.private_key_pem
    }

    script = "terraform/scripts/setup.sh"
  }
}

resource aws_vpc r1 {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = {
    Name = "Agent Benchmarks - VPC R1",
    Purpose = var.purpose
  }
}

resource aws_subnet r1_az1 {
  vpc_id = aws_vpc.r1.id
  cidr_block = "10.0.0.0/24"
  availability_zone = data.aws_availability_zones.r1.names[0]
}

resource aws_security_group sg_default_r1 {
  name        = "sg_benchmarks_default_r1"
  description = var.purpose
  vpc_id      = aws_vpc.r1.id

  # outbound internet access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource aws_security_group sg_bastion_r1 {
  name        = "sg_benchmarks_bastion_r1"
  description = var.purpose
  vpc_id      = aws_vpc.r1.id

  # SSH from the internet
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource aws_internet_gateway agw_r1 {
  vpc_id = aws_vpc.r1.id
  tags = {
    Name = "Agent Benchmarks - IG R1",
    Purpose = var.purpose
  }
}

resource aws_route internet_access_r1 {
  route_table_id         = aws_vpc.r1.main_route_table_id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.agw_r1.id
}

# For SSH auth
resource tls_private_key dev {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource aws_key_pair key_r1 {
  key_name   = "dev_key_r1"
  public_key = tls_private_key.dev.public_key_openssh
}
