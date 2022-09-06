import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import * as azure_native from "@pulumi/azure-native";

export class Velero {
    private readonly config: pulumi.Config;
    private readonly azureRegion: string;
    private readonly azureEnv: string;
    private readonly azureWorkload: string;

    public constructor(config: pulumi.Config) {
        this.azureRegion = config.require("azure.region-short");
        this.azureEnv = config.require("azure.env");
        this.azureWorkload = "masterloftvelero";

        this.config = config;
    }

    public provision(): void {
        const resourceGroup: resources.ResourceGroup = this.createResourceGroup();
        const account = this.createStorageAccount(resourceGroup);
        this.createBackupContainer(resourceGroup, account);
    }

    private createResourceGroup(): resources.ResourceGroup {
        return new resources.ResourceGroup(`rg-${this.azureWorkload}-${this.azureEnv}-${this.azureRegion}`,
         { resourceGroupName: `rg-${this.azureWorkload}-${this.azureEnv}-${this.azureRegion}` });
    }

    private createStorageAccount(resourceGroup: resources.ResourceGroup): storage.StorageAccount {
        return new storage.StorageAccount(`st${this.azureWorkload}${this.azureEnv}`, {
            accountName: `st${this.azureWorkload}${this.azureEnv}`,
            kind: "StorageV2",
            resourceGroupName: resourceGroup.name,
            sku: {
                name: "Standard_LRS"
            },
        });
    }

    private createBackupContainer(resourceGroup: resources.ResourceGroup, storage: storage.StorageAccount): storage.BlobContainer {
        return new azure_native.storage.BlobContainer(`st${this.azureWorkload}${this.azureEnv}-container-velero`, {
            accountName: storage.name,
            containerName: "velero",
            resourceGroupName: resourceGroup.name,
        });
    }
} 