variable "environment" {
  type        = string
  description = "Environment name (e.g. dev, prod), used in resource names/tags and to gate prod-only safety settings."
}

variable "clinic_users" {
  type = list(object({
    name  = string
    email = string
  }))
  description = "Initial Clinic User roster (UC-011, architecture.md §2.5, from input.yaml). Adding an entry and re-applying is how a new staff member is onboarded during this phase."
}
