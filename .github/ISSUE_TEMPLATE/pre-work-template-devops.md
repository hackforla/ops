---
name: Pre-work Template - DevOps
about: Newly onboarded team members should start by making this issue for themselves
title: 'Pre-work Checklist: DevOps: [replace brackets with your name]'
labels: 'Complexity: Prework, Feature: Onboarding/Contributing.md, role missing, size:
  1pt'
assignees: ''

---

### Prerequisite
We are looking forward to having you on our team. Please ensure you have prior experience with the HfLA website team (do all steps in your skills issues up to, and including, section 13), before contributing to our repository.
### Overview
As a new member on the HfLA devops-security team, fill in the following fields as you complete each onboarding item.

### Special Notes
1. Keep this issue open until you've completed all steps, including learning to provide updates for longer tasks.
2. Normally, handle one issue at a time, but this one is an exception as it teaches how to manage multiple tasks.
3. Work on action items sequentially, but proceed if possible. For example, set up your dev environment without waiting for the weekly meeting.

### Action Items

- [ ] Confirm you have completed steps 1-13 on the website team and paste a link to your website team skills issue into a comment on this issue with the following text
   ```
   Here is my skills issue from the website team
   - # 
   ```
- [ ] Before starting to work on the below instructions, make sure to join the #ops Slack Channel. And are a member of `devops-security` repository.
- [ ] Self-assign this issue (gear in right side panel).
- [ ] Add this issue to the Project Board CoP: DevOps: Project Board - under the Projects section (gear in right side panel).
- [ ] Attend weekly team meeting, Wednesdays 6-8pm PST.
  - [ ] Note: There are no meetings on the 1st Wednesday of every month.
- [ ] Complete the steps in [Creating a personal AWS account](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#creating-a-personal-aws-account) and [Login as root user & setup MFA](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#login-as-root-user-&-setup-mfa).
- [ ] Read and follow the instructions in [Setting up IAM and AWS CLI](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#setting-up-iam-and-aws-cli) for:
    - [ ] [Creating an IAM User](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#create-an-iam-group)
    - [ ] [Creating an IAM Group](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#create-an-iam-group)
    - [ ] [Attaching IAM user to IAM Group](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#attach-iam-user-to-iam-group)
    - [ ] [Providing `AdministratorAccess` policy to IAM group](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#attach-administratoraccess-policy-to-iam-group)
    - [ ] Log in as the newly created user instead of continuing to log in as the root user (it is not recommended to login with root access).
    - [ ] [Generating user access keys](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#generating-access-keys-for-aws-cli)
- [ ] Complete the instructions in [AWS Documentation](https://docs.aws.amazon.com/cli/v1/userguide/cli-chap-install.html) and choose your operating system to install AWS CLI. 
- [ ] Complete the instruction in [AWS Documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-authentication-short-term.html) to setup the AWS CLI.
- [ ] Follow the instructions in [Creating a backend state](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#creating-backend-state) to create the S3 bucket and DynamoDB table.
  - [ ] Create the S3 bucket
  - [ ] Create the DynamoDB table
- [ ] Install Terraform locally by following the instructions of the installation guide mentioned in [Installing Terraform](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#installing-terraform)
- [ ] Install Terraform Docs locally by following the instructions of the installation guide mentioned in [Installing Terraform docs](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#installing-terraform-docs)
- [ ] Complete the instructions in [Clone the repository](https://github.com/hackforla/devops-security/blob/main/CONTRIBUTING.md#clone-the-repository)
- [ ] Submit a [new request](https://github.com/hackforla/devops-security/issues/new?assignees=&labels=enhancement&projects=&template=request-aws-iam-resources.yml) to create new AWS user account and then self-assign this issue.
- [ ] Create a new branch from main by executing the command

    ```bash
    git checkout -b issue-number-add-new-iam-user

    ```
- [ ] Navigate to the `aws-user.tf` file and add your user information to the end of the file following the below template.

    ```bash
    # Replace USERNAME with your GitHub handle
    module "iam_user_USERNAME" {
    source = "./modules/aws-users"

    user_name = "USERNAME" # Replace with GitHub handle
    user_tags = {
      "Project"      = "devops-security"
      "Access Level" = "1"
    }
    user_groups = ["read-only-group"]
    }

    ```
- [ ] In your code editor navigate to `terraform` directory. `cd terraform`

Note: You must be authenticated to your AWS account via the CLI for the next commands to work. The above instructions for setting up the CLI will guide you through this process. To check to see if you are authenticated, run `aws sts get-caller-identity`. You should get a response like:

```
{
    "UserId": "ABCDEFGHIJKLMNOPQRSTU",
    "Account": "012345678910",
    "Arn": "arn:aws:iam::012345678910:user/USERNAME"
}
```
If you are unable to authenticate from your local machine using the CLI, post in the #ops channel in Slack so that the team can help you get unblocked.
- [ ] Execute the command `terraform init` to initialize terraform in the directory. Address any failures that arise (if any).
- [ ] Execute the command `terraform plan` this will output a plan replicating the same IAM resources as the devops security account. Address any failures that arise (if any).
- [ ] Then execute the command `terraform apply` this will create all of the resources that are currently managed by Devops Security. All of the resources created here incur zero cost except for the Dynamo DB installation, which should remain in the free tier. **
  - [ ] **If you have cost concerns, Run a Terraform Destroy to take down all of the resources you created (don't worry, you can recreate them just as quickly). If you create resources outside of what's described in this issue, you may incur charges.**
- [ ] Update the README using Terraform Docs to document changes
  - [ ] ```terraform-docs -c .terraform.docs.yml .```
- [ ] Once you have tested your changes, stage them in git with 
    - [ ] `git status` command.
    - [ ] then `git add path/to/file` (you can copy from above output for the file path).
- [ ] Commit the changes by executing `git commit -m "brief description of changes"`.
- [ ] Push the changes with `git push --set-upstream origin name-of-branch`
