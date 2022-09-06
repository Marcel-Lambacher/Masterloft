import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as network from "@pulumi/azure-native/network";
import * as compute from "@pulumi/azure-native/compute";

interface SimplifiedInboundNetworkRules {
    name: string;
    portRange: string;
    priority: number;
}

export class TunnelVmProvisioner {
    private readonly config: pulumi.Config;
    private readonly azureRegion: string;
    private readonly azureEnv: string;
    private readonly azureWorkload: string;
    private readonly azureWorkloadShort: string;

    private _virtualMachine:  compute.VirtualMachine | undefined
    private _publicIp:  network.PublicIPAddress | undefined

    private get desiredVirtualMachineName(): string {
        return `vm${this.azureWorkloadShort}001`;
    }

    public constructor(config: pulumi.Config) {
        this.azureRegion = config.require("azure.region-short");
        this.azureEnv = config.require("azure.env");
        this.azureWorkload = config.require("azure.workload");
        this.azureWorkloadShort = config.require("azure.workload-short");

        this.config = config;
    }

    public get virtualMachine(): compute.VirtualMachine {
        return this._virtualMachine as compute.VirtualMachine;
    }

    public get publicIp(): network.PublicIPAddress {
        return this._publicIp as network.PublicIPAddress;
    }

    public provision(): void {
        const resourceGroup: resources.ResourceGroup = this.createResourceGroup();
        const networkSecurityGroup: network.NetworkSecurityGroup = this.createNetworkSecurityGroup(resourceGroup);
        const [networkInterface, publicIp] = this.createNetwork(resourceGroup, networkSecurityGroup);
        this._publicIp = publicIp;
        this._virtualMachine  = this.createVirtualMachine(resourceGroup, networkInterface);
    }

    private createResourceGroup(): resources.ResourceGroup {
        return new resources.ResourceGroup(`rg-${this.azureWorkload}-${this.azureEnv}-${this.azureRegion}`,
         { resourceGroupName: `rg-${this.azureWorkload}-${this.azureEnv}-${this.azureRegion}` });
    }

    private createNetworkSecurityGroup(resourceGroup: resources.ResourceGroup): network.NetworkSecurityGroup {
        const networkSecurityGroup = new network.NetworkSecurityGroup(`nsg-${this.azureWorkload}-001`, {
            networkSecurityGroupName: `nsg-${this.azureWorkload}-001`,
            resourceGroupName: resourceGroup.name,
        }); 
        
        const inboundNetworkRules = this.config.requireObject<SimplifiedInboundNetworkRules[]>("vm.inbound-network-rules");
        inboundNetworkRules.map(rule => new network.SecurityRule(rule.name, {
            securityRuleName: rule.name,
            networkSecurityGroupName: networkSecurityGroup.name,
            resourceGroupName: resourceGroup.name,
            access: "Allow",
            destinationPortRange: rule.portRange,
            destinationAddressPrefix: "*",
            priority: rule.priority,
            direction: "Inbound",
            protocol: "*",
            sourcePortRange: "*",
            sourceAddressPrefix: "*"
        }))

        return networkSecurityGroup;
    }

    private createNetwork(resourceGroup: resources.ResourceGroup, networkSecurityGroup: network.NetworkSecurityGroup): [network.NetworkInterface, network.PublicIPAddress] {
        const virtualNetwork = new network.VirtualNetwork(`vnet-${this.azureEnv}-${this.azureRegion}-001`, {
            virtualNetworkName: `vnet-${this.azureEnv}-${this.azureRegion}-001`,
            resourceGroupName: resourceGroup.name,
            addressSpace: { addressPrefixes: ["10.0.0.0/16"] },
            subnets: [{
                name: "default",
                addressPrefix: "10.0.1.0/24",
                networkSecurityGroup: { id: networkSecurityGroup.id }
            }],
        });
        
        const publicIp = new network.PublicIPAddress(`pip-${this.desiredVirtualMachineName}-${this.azureEnv}-${this.azureRegion}-001`, {
            publicIpAddressName: `pip-${this.desiredVirtualMachineName}-${this.azureEnv}-${this.azureRegion}-001`,
            resourceGroupName: resourceGroup.name,
            publicIPAllocationMethod: network.IPAllocationMethod.Static
        });
        
        const networkInterface = new network.NetworkInterface(`nic-${this.desiredVirtualMachineName}-${this.azureEnv}-001`, {
            networkInterfaceName: `nic-${this.desiredVirtualMachineName}-${this.azureEnv}-001`,
            resourceGroupName: resourceGroup.name,
            enableIPForwarding: true,
            ipConfigurations: [{
                name: "default",
                subnet: virtualNetwork.subnets.apply(subnet => subnet![0]),
                privateIPAllocationMethod: network.IPAllocationMethod.Dynamic,
                publicIPAddress: { id: publicIp.id },
            }],
        });

        return [networkInterface, publicIp];
    }

    private createVirtualMachine(resourceGroup: resources.ResourceGroup, networkInterface: network.NetworkInterface):  compute.VirtualMachine {
        return new compute.VirtualMachine(this.desiredVirtualMachineName, {
            vmName: this.desiredVirtualMachineName,
            resourceGroupName: resourceGroup.name,
            networkProfile: {
                networkInterfaces: [{ id: networkInterface.id }],
            },
            hardwareProfile: {
                vmSize: this.config.require("vm.size")
            },
            osProfile: {
                adminUsername: this.config.require("vm.username"),
                adminPassword: this.config.requireSecret("vm.password"),      
                computerName: this.desiredVirtualMachineName,
                linuxConfiguration: {
                    disablePasswordAuthentication: true,
                    ssh: {
                        publicKeys: [
                            {
                                keyData: this.config.requireSecret("vm.ssh-public-key"),
                                path: `/home/${this.config.require("vm.username")}/.ssh/authorized_keys`
                            }
                        ]
                    }
                },
            },
            storageProfile: {
                osDisk: {
                    createOption: compute.DiskCreateOption.FromImage,
                    name: `disk${this.desiredVirtualMachineName}`,
                    managedDisk: {
                        storageAccountType: "StandardSSD_LRS",
                    },
                },
                imageReference: {
                    publisher: "canonical",
                    offer: "UbuntuServer",
                    sku: "18.04-LTS",
                    version: "latest",
                },
            },
        });
    }
} 