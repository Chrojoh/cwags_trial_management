# 🚀 GitHub Pages Deployment Guide

This guide will walk you through deploying your Dog Trial Management System to GitHub Pages for free hosting.

## 📋 Prerequisites

- GitHub account (free)
- Basic understanding of file upload/management
- Your dog registration data in Excel or CSV format

## 🔧 Step-by-Step Deployment

### Step 1: Create GitHub Repository

1. **Go to GitHub.com** and sign in to your account
2. **Click "New Repository"** (green button or + icon)
3. **Repository Settings:**
   - Repository name: `dog-trial-management` (or your preferred name)
   - Description: `Dog Trial Management System`
   - Set to **Public** (required for free GitHub Pages)
   - Check **"Add a README file"**
   - Add `.gitignore` template: None
   - Choose license: MIT License (recommended)
4. **Click "Create repository"**

### Step 2: Upload Website Files

**Option A: Web Interface (Easiest)**

1. **In your new repository**, click "Add file" → "Upload files"
2. **Upload all files** in this exact structure:
   ```
   ├── index.html
   ├── entry-form.html
   ├── README.md
   ├── assets/
   │   ├── css/
   │   │   ├── main.css
   │   │   ├── forms.css
   │   │   ├── tables.css
   │   │   └── responsive.css
   │   ├── js/
   │   │   ├── core/
   │   │   │   ├── app.js
   │   │   │   ├── storage.js
   │   │   │   └── utils.js
   │   │   └── components/
   │   │       ├── trial-setup.js
   │   │       ├── entry-form.js
   │   │       ├── score-sheets.js
   │   │       ├── running-order.js
   │   │       └── exports.js
   │   └── data/
   │       └── dogs.json
   ```

3. **Drag and drop files** or use "choose your files"
4. **Commit changes** with message: "Initial website upload"

**Option B: Git Command Line (Advanced)**

```bash
git clone https://github.com/yourusername/dog-trial-management.git
cd dog-trial-management
# Copy all website files to this directory
git add .
git commit -m "Initial website upload"
git push origin main
```

### Step 3: Configure Your Dog Data

1. **Replace sample data** in `assets/data/dogs.json`
2. **Convert your Excel data** to JSON format:

**If you have Excel/CSV:**
- Open your Excel file
- Save as CSV
- Use online converter (csv2json.com) or convert manually

**Example JSON format:**
```json
[
  {
    "registration": "YOUR_DOG_ID",
    "callName": "Dog Name",
    "handler": "Handler Name",
    "class": "Agility 1",
    "judges": "Judge Name"
  }
]
```

3. **Upload updated dogs.json** to replace the sample data

### Step 4: Enable GitHub Pages

1. **Go to repository Settings** tab
2. **Scroll to "Pages"** section (left sidebar)
3. **Source settings:**
   - Source: "Deploy from a branch"
   - Branch: `main` or `master`
   - Folder: `/ (root)`
4. **Click "Save"**
5. **Wait 2-5 minutes** for deployment

### Step 5: Access Your Website

1. **GitHub will provide URL:** `https://yourusername.github.io/dog-trial-management`
2. **Bookmark this URL** - this is your trial management dashboard
3. **Test the system:**
   - Create a sample trial
   - Try the entry form
   - Test with your dog data

## 🔗 Custom Domain (Optional)

### Using Your Own Domain

1. **Purchase domain** from registrar (GoDaddy, Namecheap, etc.)
2. **In GitHub Pages settings:**
   - Enter your domain in "Custom domain"
   - Check "Enforce HTTPS"
3. **Configure DNS** at your registrar:
   ```
   Type: CNAME
   Name: www
   Value: yourusername.github.io
   ```

## 📊 Data Management

### Dog Registration Data

**Columns Required:**
- `registration`: Unique dog ID (Column A in Excel)
- `callName`: Competition name (Column B in Excel)
- `handler`: Handler name (Column D in Excel)
- `class`: Default class (Column I in Excel)
- `judges`: Qualified judges (Column K in Excel)

**Tips:**
- Keep registration numbers consistent
- Use proper capitalization for names
- Separate multiple judges with commas
- Validate data before uploading

### Data Storage

- **Local Storage**: All trial data stored in browser
- **No Database Required**: Fully client-side system
- **Privacy**: No data sent to external servers
- **Backup**: Export features built-in

## 🛠 Customization

### Branding

**Update in `index.html` and `entry-form.html`:**
- Page titles
- Header text
- Organization name
- Contact information

**Modify `assets/css/main.css`:**
- Color scheme (search for color variables)
- Fonts
- Logo placement

### Classes and Judges

**Default classes in `assets/data/dogs.json`:**
```json
{
  "class": "Agility 1",
  "judges": "Jane Doe, Mike Wilson"
}
```

**Available classes automatically loaded from dog data**

### Features

**Enable/Disable Components:**
- Comment out unwanted tab buttons in `index.html`
- Remove corresponding sections
- Modify JavaScript to skip features

## 🔧 Troubleshooting

### Common Issues

**Website not loading:**
- Check GitHub Pages is enabled
- Verify all files uploaded correctly
- Wait 5-10 minutes after changes

**Dog data not appearing:**
- Validate JSON format at jsonlint.com
- Check file path: `assets/data/dogs.json`
- Verify browser console for errors

**Entry form not working:**
- Check trial has been saved and published
- Verify URL includes `?trial=TRIAL_ID`
- Test with sample data first

**Mobile issues:**
- Clear browser cache
- Check responsive CSS loaded
- Test on different devices

### Browser Console

**Check for errors:**
1. Right-click → "Inspect Element"
2. Go to "Console" tab
3. Look for red error messages
4. Report issues with error details

## 📈 Usage Analytics (Optional)

### Google Analytics

**Add to `index.html` and `entry-form.html`:**
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🔄 Updates and Maintenance

### Updating the System

1. **Download new files** from repository
2. **Upload to GitHub** replacing old files
3. **Update dog data** as needed
4. **Test functionality** after updates

### Regular Maintenance

- **Backup trial data** monthly using export functions
- **Update dog registrations** as needed
- **Clear old trial data** if storage gets full
- **Monitor for browser compatibility** issues

### Data Backup Schedule

**Weekly:**
- Export current trial data (JSON)
- Save to local computer/cloud storage

**Monthly:**
- Full system backup using backup function
- Update dog database if needed

**Before Major Events:**
- Complete system backup
- Test all functionality
- Verify dog data accuracy

## 📞 Support

### Getting Help

**GitHub Issues:**
- Report bugs and feature requests
- Search existing issues first
- Provide detailed error information

**Documentation:**
- Check README.md for basic usage
- Review code comments for technical details
- See example configurations

**Community:**
- GitHub Discussions for questions
- Share configurations and tips
- Help other trial organizers

## ✅ Deployment Checklist

### Pre-Launch
- [ ] Repository created and configured
- [ ] All files uploaded correctly
- [ ] GitHub Pages enabled
- [ ] Dog data updated with real information
- [ ] Website loads without errors
- [ ] Sample trial created and tested
- [ ] Entry form tested with sample data
- [ ] Mobile responsiveness verified

### Post-Launch
- [ ] Bookmark dashboard URL
- [ ] Share entry form links with participants
- [ ] Monitor for issues during first trial
- [ ] Set up regular backup schedule
- [ ] Document any customizations made

### Go-Live
- [ ] Final data verification
- [ ] Test complete trial workflow
- [ ] Prepare backup communication method
- [ ] Have technical contact available
- [ ] Monitor during active use

## 🎯 Success Tips

**For Trial Organizers:**
- Test system thoroughly before your first trial
- Have backup plans for technical issues
- Train trial secretary on basic functions
- Keep dog database updated regularly

**For Participants:**
- Provide clear entry form instructions
- Test links before sending to participants
- Have contact method for technical support
- Consider SMS backup for critical communications

**For Ongoing Use:**
- Regular backups prevent data loss
- Update dog data between trials
- Monitor browser compatibility changes
- Keep system updated with latest features

---

**Congratulations! Your Dog Trial Management System is now live and ready to use! 🎉**

For additional support, check the GitHub repository issues or discussions section.