import * as pulumi from "@pulumi/pulumi";;
import { TunnelVmProvisioner } from './tunnelVmProvisioner';
import { Velero } from './velero';

const config = new pulumi.Config();

const tunnelVmProvisioner = new TunnelVmProvisioner(config);
tunnelVmProvisioner.provision();

const velero = new Velero(config);
velero.provision();


export const publicIpAddress = tunnelVmProvisioner.publicIp.ipAddress;