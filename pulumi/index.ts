import * as pulumi from "@pulumi/pulumi";
import { provisionMasterNode } from "./hetzner";
import { provision } from "./digitalocean"

const config = new pulumi.Config();

const k8sMaster = provisionMasterNode(config);
provision(config, k8sMaster.ipv4Address);

export const masterPublicIp = k8sMaster.ipv4Address