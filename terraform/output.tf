output "client_r1_ip" {
  value = aws_instance.client_r1.public_ip
}

output "private_key" {
  value = tls_private_key.dev.private_key_pem
  sensitive = true
}
