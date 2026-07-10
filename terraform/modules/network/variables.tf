variable "environment" {
  type        = string
  description = "Environment name (e.g. dev, prod), used in resource Name tags."
}

variable "vpc_cidr" {
  type        = string
  description = "Primary CIDR block for the VPC (architecture.md §5.1, from that environment's input.yaml)."
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones to spread public/private subnets across (from input.yaml)."
}
