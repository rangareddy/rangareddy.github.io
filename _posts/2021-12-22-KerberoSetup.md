---
layout: post
title: Kerberos Setup in Linux
categories: Linux
tags: Linux Kerberos Security
author: Ranga Reddy
date: "2021-12-22 00:00:00 +0530"
---

* content
{:toc}

## Kerberos

Kerberos is a secure authentication method developed by MIT that allows two services located in a non-secured network to authenticate themselves in a secure way. Kerberos, which is based on a **ticketing system**, serves as both **Authentication Server** and as **Ticket Granting Server \(TGS\)**.

Kerberos has become the standard authentication method within the Hadoop ecosystem. For this reason, most Big Data technologies have adopted it as their authentication method.

## Install & Configure Kerberos Server & Client in Linux

Let's see how we can install, setup and configure Kerberos in a Cluster.

We will install Kerberos Server in one machine and Kerberos client in rest of the machines.

### Step 1: Install Kerberos Client

We need to install Kerberos Client On all the Nodes or machines in the Cluster

`$ yum install krb5-workstation krb5-libs krb5-auth-dialog`

### Step2: Install Kerberos Server

Kerberos Server can be installed in Master Node . But that is not a strict rule. Alternatively it can be installed in any server within the Cluster.

`$ yum install krb5-server`

### Step 3: Configure Kerberos

As part of the configuration , we will need to make changes to two files --

#### 3.1 `kdc.conf` changes

Login Kerberos Server Installed machine

`$ vi /var/kerberos/krb5kdc/kdc.conf`

```sh
[kdcdefaults]
 kdc_ports = 88
 kdc_tcp_ports = 88

[realms]
 EXAMPLE.COM = {
  #master_key_type = aes256-cts
  acl_file = /var/kerberos/krb5kdc/kadm5.acl
  dict_file = /usr/share/dict/words
  admin_keytab = /var/kerberos/krb5kdc/kadm5.keytab
  supported_enctypes = aes256-cts:normal aes128-cts:normal des3-hmac-sha1:normal arcfour-hmac:normal camellia256-cts:normal camellia128-cts:normal des-hmac-sha1:normal des-cbc-md5:normal des-cbc-crc:normal
 }
 EXAMPLE.COM = {
   renew_lifetime = 7d
 }
```

In the above kdc.conf file we choosed realm is EXAMPLE.COM

#### 3.2 `krb5.conf` changes

`$ vi /etc/krb5.conf`

```sh
{
    [logging]
        default = FILE:/var/log/krb5libs.log
        kdc = FILE:/var/log/krb5libs.log
        admin_server = FILE:/var/log/kadmind.log

    [libdefaults]
        default_realm = EXAMPLE.COM
        dns_lookup_kdc = false
        dns_lookup_realm = false
        ticket_lifetime = 24h
        renew_lifetime = 7d
        forwardable = true
        default_tgs_enctypes = aes256-cts aes128-cts des3-hmac-sha1 des-hmac-sha1 des-cbc-crc
        default_tkt_enctypes = aes256-cts aes128-cts des3-hmac-sha1 des-hmac-sha1 des-cbc-crc
        permitted_enctypes = aes256-cts aes128-cts des3-hmac-sha1 des-hmac-sha1 des-cbc-crc
        udp_preference_limit = 1
        kdc_timeout = 3000
    [realms]
        EXAMPLE.COM = {
            kdc = node1.example.com
            admin_server = node1.example.com
        }
    [domain_realm]
}
```

### Step 4: Create Kerberos KDC Database

In this step , we will create a KDC -- Key Distribution Centre database. This database is used by the Kerberos server. So it is a crucial point in our installation steps.

`$ kdb5 util create -r EXAMPLE.COM -s`

It will ask for setting up a Master Password . Follow as asked and note down the password. This password is needed for any KDC database related activities like restart or any DB changes later etc.

### Step 5: ACL changes

`$ vi /var/kerberos/krb5kdc/kadm5.acl`

Modify with your Realm name. In our case as , it is --

`*/admin@EXAMPLE.COM        *`

### Step 6: Add Admin for KDC

Note this Step MUST BE Executed only in the KDC Server machine -- NOT in any Kerberos client machines.

`$ kadmin.local`

This will bring you to kadmin.local prompt. In that prompt, use the highlighted command. Note you have to use your own Realm name.

`kadmin.local: addprinc   root/admin@EXAMPLE.COM`

To see list of all principals created --

`kadmin.local : listprincs`

### Step 7: Restart the Kerberos Admin & KDC Server

Note these steps MUST be done in KDC Server machine.

Restart KDC Server

`$ service krb5kdc start`

Restart KADMIN Server

`$ service kadmin start`

We are done with the Setup. We will test it from Kerberos as well Client servers.

### Testing 1: Test Kerberos from Server

Test the Kerberos installation. Use the below command --

Check if any Ticket exists

`$ klist`

If no tickets exist in the cache, create a new one

`$ kinit root/admin`

Check again if you have any ticket

`$ klist`

Hopefully now you can see tickets listed here.

If you want to destroy any ticket, use

`$ kdestroy`

### Testing 2 : Test Kerberos from Client machine

In previous step, we tested Kerberos from Kerberos server itself.

In this step, we will test Kerberos from the client machine. This step is important because in most cases you will use the client machines as a user. And if the user tries to access any services in the network , it will need Kerberos authentication. So let's try this .

#### 1\. Create a non-admin user

So , we will use a non-admin user . Use below commands in KDC server to create a normal user (i.e. user with no admin access).

`$ kadmin.local`

In kadmin.local prompt use --

`kadmin.local: addprinc rangareddy@EXAMPLE.COM`

so we have created a normal user *rangareddy*.

#### 2\. Create a keytab file for the user

We will create a keytab file for the user rangareddy

`$ kadmin.local`

In kadmin.local prompt, use below

`kadmin.local: xst -norandkey -k /tmp/rangareddy.keytab rangareddy@EXAMPLE.COM`

It will create a keytab file rangareddy.keytab in /tmp directory for the rangareddy.

#### 3\. Test Kerberos from client machine

In previous step, we created the `rangareddy.keytab` file in KDC SERVER machine.

Copy the keytab file to the client machine.

Lets place it in `/root/rangareddy.keytab` in client machine.

Now in the client machine, open command prompt

Create a kerberos ticket

`$ kinit -kt /root/rangareddy.keytab rangareddy@EXAMPLE.COM`

Check if ticket created

`$ klist`
