# Creating v1.0.1 Release

## Summary

This document provides instructions for creating the v1.0.1 tag to trigger an automated GitHub release. The repository is already prepared with version 1.0.1 in all relevant files, but tag creation is blocked by repository protection rules and must be done manually.

## Current State

✅ **Repository is ready for release:**
- Version 1.0.1 set in `package.json` (commit c249022)
- Release notes added to `CHANGELOG.md` (commit c249022)
- Release workflow configured in `.github/workflows/release.yml`

⏸️ **Action needed:**
- Create and push v1.0.1 tag (blocked by repository rules)

🔒 **Protection in place:**
- Repository rules prevent automated tag creation
- Tag must be created by someone with administrative permissions

## How to Create the Release

### Method 1: GitHub Web UI (Recommended)

This is the simplest method and creates both the tag and release in one step:

1. Navigate to: https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card/releases/new

2. In the "Choose a tag" dropdown:
   - Type: `v1.0.1`
   - Click "Create new tag: v1.0.1 on publish"

3. Set the target:
   - Select branch: `main`
   - Or target specific commit: `c249022` (recommended)

4. Fill in release details:
   - **Title**: `Release v1.0.1`
   - **Description**: You can use auto-generate release notes or copy from CHANGELOG.md:
     ```
     ## [1.0.1] - 2024-12-03
     
     ### Changed
     - Minor updates and improvements
     ```

5. Click **"Publish release"**

This will:
- Create the v1.0.1 tag
- Create the GitHub release
- Trigger the release workflow to attach `ac-infinity-card.js` and `ac-infinity-card-editor.js`

### Method 2: Git Command Line

If you have local git access with appropriate permissions:

```bash
# Ensure you have the latest code
git fetch origin

# Create an annotated tag pointing to the version bump commit
git tag -a v1.0.1 -m "Release version 1.0.1" c249022

# Push the tag to GitHub
git push origin v1.0.1
```

This will trigger the `.github/workflows/release.yml` workflow, which will automatically create the GitHub release.

### Method 3: GitHub CLI

If you have `gh` CLI installed and authenticated:

```bash
# Create a release (which also creates the tag)
gh release create v1.0.1 \
  --title "Release v1.0.1" \
  --notes "Minor updates and improvements" \
  --target c249022 \
  --repo JoshuaSeidel/hass-acinfinity-lovelace-card
```

## What Happens After Tag Creation

Once the v1.0.1 tag is pushed to GitHub:

1. **GitHub Actions Trigger**: The workflow at `.github/workflows/release.yml` will run automatically

2. **Release Created**: A new release will appear at https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card/releases

3. **Files Attached**: The workflow will attach:
   - `ac-infinity-card.js`
   - `ac-infinity-card-editor.js`

4. **Release Notes**: Generated automatically by GitHub based on commits since v1.0.0

## Verification

After creating the release:

1. **Check the release**: https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card/releases
   - Should see "Release v1.0.1" listed

2. **Verify workflow ran**: https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card/actions
   - Should see a successful "Create Release" workflow run

3. **Check tag exists**: https://github.com/JoshuaSeidel/hass-acinfinity-lovelace-card/tags
   - Should see v1.0.1 tag listed

## Troubleshooting

### If the workflow doesn't trigger

The workflow only triggers on tags matching the pattern `v*.*.*`. Ensure your tag is exactly `v1.0.1` (with the lowercase 'v').

### If you need to recreate the tag

If something goes wrong and you need to delete and recreate the tag:

```bash
# Delete local tag
git tag -d v1.0.1

# Delete remote tag
git push origin :refs/tags/v1.0.1

# Recreate and push
git tag -a v1.0.1 -m "Release version 1.0.1" c249022
git push origin v1.0.1
```

Or use GitHub UI to delete the release and tag, then recreate using Method 1.

## Repository Protection Rules

This repository has protection rules that prevent tag creation through automated CI/CD pipelines. This is a security best practice that prevents:
- Accidental tag overwrites
- Malicious tag manipulation
- Unintended release triggers

These rules require manual approval or elevated permissions for tag creation, ensuring release quality and security.

## Questions?

If you encounter any issues creating the release, check:
- Repository settings → Rules → Rulesets
- Your GitHub permissions on this repository
- The Actions tab for workflow errors

## Related Files

- `.github/workflows/release.yml` - Release automation workflow
- `package.json` - Contains version 1.0.1
- `CHANGELOG.md` - Contains v1.0.1 release notes
- `hacs.json` - HACS integration configuration
