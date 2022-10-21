#!/usr/bin/env python3

import os
import json
from tokenize import String
import requests
import urllib3
from typing import Dict, List

class ProxmoxInventory(object):

    def __init__(self) -> None:
        self.inventory = self.__get_default_inventory()

    def render_inventory(self) -> None:
        print(json.dumps(self.inventory))

    def add_master(self, ip) -> None:
        self.inventory["k8s-masters"]["hosts"].append(ip)

    def add_node(self, ip) -> None:
        self.inventory["k8s-nodes"]["hosts"].append(ip)

    def __get_default_inventory(self) -> Dict:
        return {
            "k8s-masters": {
                "hosts": [],
                "vars": {
                    "ansible_connection": "ssh",
                    "ansible_ssh_user": "marlam"
                }
            },
            "k8s-nodes": {
                "hosts": [],
                "vars": {
                    "ansible_connection": "ssh",
                    "ansible_ssh_user": "marlam"
                }
            }
        }

class ProxmoxClient(object):

    def __init__(self) -> None:
        self.host = os.getenv("proxmox_host")
        self.user = os.getenv("proxmox_user")
        self.password = os.getenv("proxmox-password")
        self.node = os.getenv("proxmox_node")
        self.baseUrl = f"https://{self.host}:8006/api2/json"
        self.session = requests.Session()
        self.is_authenticated = False

    def __authenticate(self) -> None:
        data = { "username": self.user, "password": self.password }
        response = self.session.post(url = f"{self.baseUrl}/access/ticket", data=data, verify=False)
        self.__set_authentication_headers(response.json())

    def __set_authentication_headers(self, authentication_response) -> None:
        self.session.headers.update({"Cookie": f"PVEAuthCookie={authentication_response['data']['ticket']}"})
        self.session.headers.update({"CSRFPreventionToken": authentication_response["data"]["CSRFPreventionToken"]})

    def __get_vm_ids(self, prefix) -> List:
        if self.is_authenticated is False:
            self.__authenticate()

        response = self.session.get(url = f"{self.baseUrl}/nodes/pve/qemu", verify=False)
        return [vm["vmid"] for vm in response.json()["data"] if vm["name"].startswith(prefix)]

    def __get_vm_ip(self, vmid) -> String:
        if self.is_authenticated is False:
            self.__authenticate()

        response = self.session.get(url = f"{self.baseUrl}/nodes/pve/qemu/{vmid}/agent/network-get-interfaces", verify=False)
        ip_addresses = [interface["ip-addresses"] for interface in response.json()["data"]["result"] if interface["name"] == "eth0"]
        return [ip["ip-address"] for ip in ip_addresses[0] if ip["ip-address-type"] == "ipv4"][0]
    
    def get_vm_ips(self, prefix) -> List:
        vm_ids = self.__get_vm_ids(prefix)
        return [self.__get_vm_ip(id) for id in vm_ids]


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

os.environ["proxmox_host"] = "192.168.178.28"
os.environ["proxmox_user"] = "root@pam"
os.environ["proxmox-password"] = "marlam"
os.environ["proxmox_node"] = "pve"

inventory = ProxmoxInventory()

client = ProxmoxClient()
masters = client.get_vm_ips("k8s-master")
[inventory.add_master(master) for master in masters]

nodes = client.get_vm_ips("k8s-node")
[inventory.add_node(node) for node in nodes]

inventory.render_inventory()