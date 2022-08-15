storage "raft" {
  path    = "./vault/file"
  node_id = "node1"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = "true"
}

path "secret/*"
{
  capabilities = ["create", "read", "update", "delete", "list"]
}

api_addr = "http://127.0.0.1:8200"
cluster_addr = "https://127.0.0.1:8201"
ui = true
