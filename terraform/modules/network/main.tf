# Network layer (architecture.md §3): a VPC with private subnets for Aurora and Lambda (no
# direct public access, per §2.4/§3) and public subnets for a single NAT Gateway, so Lambda in
# the private subnets can still reach public AWS endpoints it needs at runtime — Secrets
# Manager for DB credentials (§3) and X-Ray for tracing (§6). Private subnets alone don't give
# Lambda that path; a NAT Gateway was chosen over per-service VPC Interface Endpoints so
# outbound access isn't re-scoped every time the application starts calling a new AWS service.
#
# Single NAT Gateway (one AZ, not redundant per-AZ): a deliberate cost trade-off for dev's
# "agile, low-cost" framing (architecture.md §5.2) — revisit alongside prod's other HA
# decisions (architecture.md §5.1 availability_zones) when provisioning that environment.
#
# Security groups are NOT created here — they belong to the persistence/application modules
# that own the resources they protect (Aurora, Lambda), which reference this module's
# vpc_id/subnet_id outputs instead.

locals {
  az_count = length(var.availability_zones)
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.environment}-igw"
  }
}

resource "aws_subnet" "private" {
  count             = local.az_count
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.environment}-private-${var.availability_zones[count.index]}"
  }
}

resource "aws_subnet" "public" {
  count             = local.az_count
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, local.az_count + count.index)
  availability_zone = var.availability_zones[count.index]

  # No map_public_ip_on_launch: only the NAT Gateway lives in these subnets, and it gets its
  # own Elastic IP explicitly (aws_eip.nat) regardless of the subnet's auto-assign setting.

  tags = {
    Name = "${var.environment}-public-${var.availability_zones[count.index]}"
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${var.environment}-nat-eip"
  }
}

resource "aws_nat_gateway" "this" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.environment}-nat"
  }

  depends_on = [aws_internet_gateway.this]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = {
    Name = "${var.environment}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = local.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this.id
  }

  tags = {
    Name = "${var.environment}-private-rt"
  }
}

resource "aws_route_table_association" "private" {
  count          = local.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
