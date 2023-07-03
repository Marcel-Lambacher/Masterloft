import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";
import { provisionMasterNode } from "./hetzner";
import { provisionDNS } from "./digitalocean"

const config = new pulumi.Config();

const k8sMaster = provisionMasterNode(config);
provisionDNS(config, k8sMaster.ipv4Address);

export const masterPublicIp = k8sMaster.ipv4Address