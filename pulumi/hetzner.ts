import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud"

function createSshKey(config: pulumi.Config): hcloud.SshKey {
    return new hcloud.SshKey("marlam", { publicKey: config.requireSecret("defaultSSHKey") });
}

function createFirewall(): hcloud.Firewall {
    return new hcloud.Firewall("k8s-prod", {rules: [
        {
            direction: "in",
            protocol: "tcp",
            port: "80",
            description: "HTTP",
            sourceIps: [
                "0.0.0.0/0",
                "::/0",
            ],
        },
        {
            direction: "in",
            protocol: "tcp",
            port: "443",
            description: "HTTPS",
            sourceIps: [
                "0.0.0.0/0",
                "::/0",
            ],
        },
        {
            direction: "in",
            protocol: "tcp",
            port: "31719",
            description: "SSH",
            sourceIps: [
                "0.0.0.0/0",
                "::/0",
            ],
        },
        {
            direction: "in",
            protocol: "tcp",
            port: "51871",
            description: "Wireguard",
            sourceIps: [
                "0.0.0.0/0",
                "::/0",
            ],
        },
    ]});
}

export function provisionMasterNode(config: pulumi.Config): hcloud.Server {
   const sshKey = createSshKey(config);
   const fireWall = createFirewall();
    
    return new hcloud.Server("k8s-master-01", {
        serverType: "cpx11",
        image: "ubuntu-22.04",
        location: "fsn1",
        firewallIds: [ fireWall.id.apply(id => parseInt(id)) ],
        sshKeys: [ sshKey.id ],
        userData: config.requireSecret("cloudInit"),
        publicNets: [
            {
                ipv4Enabled: true,
                ipv6Enabled: false,
            }
        ]
    });
}