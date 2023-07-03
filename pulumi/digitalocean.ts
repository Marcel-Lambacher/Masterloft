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

    const project = createProjectWorkspace();

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

    new digitalocean.ProjectResources("Masterloft", {
        project: project.id,
        resources: [ defaultDomain.domainUrn ],
    });

    return defaultDomain;
}