# lynxBE

1. Run **docker-compose up -d** to start Vault on your machine
2. Run **curl --request POST --data '{"secret_shares": 5, "secret_threshold":3}' http://127.0.0.1:8200/v1/sys/init** to get unseal keys. You will get a repsonse like this:<br /><br />
{
  "keys": [
    "d3cd169a0852ba1686f5895be579e6b4b1891781ac59b8454d4b399f1fe78ca8cd",
    "fa3b79a72de08496752f6380ae7a48f4c2f8a4fb43a1cd3c13d0cbf9f1db8da1a8",
    "4cf158e51ca5fca6f13e780b3fa351d16df14414954b6667160508b84cc7729b58",
    "6fdd9f6057f8d4373185d6595d9fa74a3b140abcafeecfbd0922182ffd3173d9bc",
    "67a29da141b45ca6956a2c6fd5e063fb4ba8df6c0f592107d65709e03d346f916b"
  ],
  "keys_base64": [
    "080WmghSuhaG9Ylb5XnmtLGJF4GsWbhFTUs5nx/njKjN",
    "+jt5py3ghJZ1L2OArnpI9ML4pPtDoc08E9DL+fHbjaGo",
    "TPFY5Ryl/KbxPngLP6NR0W3xRBSVS2ZnFgUIuEzHcptY",
    "b92fYFf41DcxhdZZXZ+nSjsUCryv7s+9CSIYL/0xc9m8",
    "Z6KdoUG0XKaVaixv1eBj+0uo32wPWSEH1lcJ4D00b5Fr"
  ],
  "root_token": "s.vSHEBnLxSoelPXf63qIwfMvP"
}<br /> <br />

3. **export VAULT_TOKEN=s.vSHEBnLxSoelPXf63qIwfMvP** to save the token for the other requests
4. Let's unseal the VAULT by doing:<br />**curl \\ <br />
    --request POST \\ <br />
    --data '{"key": "d3cd169a0852ba1686f5895be579e6b4b1891781ac59b8454d4b399f1fe78ca8cd"}' \\ <br />
    http://127.0.0.1:8200/v1/sys/unseal | jq** <br />
using three of keys in the second step.
5. Creates kv version 1 **curl --header "X-Vault-Token: $VAULT_TOKEN" --request POST --data '{"type": "kv", "path": "secret", "config": {}, "options": {"version": 1}, "generate_signing_key": true}' http://localhost:8200/v1/sys/mounts/secret**
6. Enable the AppRole auth method by invoking the Vault API. <br /> **curl \
    --header "X-Vault-Token: $VAULT_TOKEN" \
    --request POST \
    --data '{"type": "approle"}' \
    http://127.0.0.1:8200/v1/sys/auth/approle**
7. Create policy for read write update delete **curl \
    --header "X-Vault-Token: $VAULT_TOKEN" \
    --request PUT \
    --data '{"policy":"# Dev servers have version 2 of KV secrets engine mounted by default, so will\n# need these paths to grant permissions:\npath \"secret/*\"\n{\n capabilities = [\"create\",\"read\", \"update\", \"delete\", \"list\"] \n} \n"}' \
    http://127.0.0.1:8200/v1/sys/policies/acl/my-policy**
8. Create a role for auth **curl \
    --header "X-Vault-Token: $VAULT_TOKEN" \
    --request POST \
    --data '{"policies": ["my-policy"]}' \
    http://127.0.0.1:8200/v1/auth/approle/role/my-role**
9. Get role id<br /> **curl \
    --header "X-Vault-Token: $VAULT_TOKEN" \
     http://127.0.0.1:8200/v1/auth/approle/role/my-role/role-id | jq -r ".data"**
    
    Here is an example of output<br />
    {
        "role_id": "0adf722d-031f-6864-faa2-fddda3ca8fba"
    }<br />
    Copy role_id and set to your .env <br /> VAULT_ROLE_ID=0adf722d-031f-6864-faa2-fddda3ca8fba
 

10. Get secret id <br />**curl \
    --header "X-Vault-Token: $VAULT_TOKEN" \
    --request POST \
    http://127.0.0.1:8200/v1/auth/approle/role/my-role/secret-id | jq -r ".data"**

    Here is an example of output <br /> {
  "secret_id": "22d1e0d6-a70b-f91f-f918-a0ee8902666b",
  "secret_id_accessor": "726ab786-70d0-8cc4-e775-c0a75070e5e5"
} <br /> and save secret_id to your .env <br/>VAULT_SECRET_ID=22d1e0d6-a70b-f91f-f918-a0ee8902666b

11. Add your vault host to your VAULT_HOST=http://localhost:8200
