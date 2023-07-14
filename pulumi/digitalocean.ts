import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

function createProjectWorkspace(): digitalocean.Project {
    return new digitalocean.Project("Masterloft", {
        name: "Masterloft",
        description: "Personal kubernetes cluster and home server suite",
        purpose: "Web Application",
        environment: "production"
    });
}

export function provisionDNS(config: pulumi.Config, publicIp: pulumi.Input<string>): digitalocean.Domain {
    const defaultDomain = new digitalocean.Domain(config.require("publicDomain"), {
        name: config.require("publicDomain"),
        ipAddress: publicIp
    });

    const dns = new digitalocean.DnsRecord("*", {
        name: "*",
        domain: defaultDomain.id,
        type: "A",
        value: publicIp,
    });

    return defaultDomain;
}

export function provisionBackupStorage(): digitalocean.SpacesBucket{
    return new digitalocean.SpacesBucket("k8s-longhorn-backup", {
        name: "k8s-longhorn-backup"
    });
}

export function provision(config: pulumi.Config, publicIp: pulumi.Input<string>) {
    const project = createProjectWorkspace();

    const domain = provisionDNS(config, publicIp);
    const space = provisionBackupStorage();

    new digitalocean.ProjectResources("Masterloft", {
        project: project.id,
        resources: [ domain.domainUrn, space.bucketUrn ],
    });
}