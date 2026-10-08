# 🎨 Creating App Icons for PWA

## Quick Icon Generation (2 Methods)

### **Method 1: Free Online Tool (Easiest)** ⭐ RECOMMENDED

1. Go to: https://www.favicon-generator.org/
2. Upload or design your icon
3. Download all sizes
4. Extract to `/public/icons/` folder

**Needed:**
- icon-192.png
- icon-512.png
- icon-192-maskable.png (with 45px padding)
- icon-512-maskable.png (with 45px padding)

---

### **Method 2: Use Existing Assets**

If you have your Vault & Vine logo:

1. Open in image editor (Photoshop, Figma, or free GIMP)
2. Export multiple sizes:
   - 192×192 px
   - 512×512 px
3. Add 45px transparent padding for maskable versions
4. Save as PNG

---

### **Method 3: Quick Online Generator**

Use multiple tools:

- **Logo Maker:** https://www.canva.com/
- **Icon Generator:** https://www.favicon-generator.org/
- **PWA Builder:** https://www.pwabuilder.com/

---

## 📁 **Directory Structure**

```
public/
├── manifest.json
├── sw.js
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-192-maskable.png
│   └── icon-512-maskable.png
└── screenshots/
    ├── screenshot-540x720.png (mobile)
    └── screenshot-1280x720.png (desktop)
```

---

## 📱 **Screenshots**

Also need screenshots for app stores:

1. **Mobile (540×720):**
   - Screenshot of login page
   - Screenshot of dashboard
   - Screenshot of stocks

2. **Desktop (1280×720):**
   - Full app interface

**Can use:**
- Browser dev tools to capture
- Online screenshot tools
- Figma mockups

---

## ✅ **Using Temporary Icons**

For testing/beta, you can use:

```bash
# Create simple colored squares as placeholders
# Then replace with real icons later
```

This won't block PWA installation - you can update icons anytime!

---

**Next:** Once you have icons in `/public/icons/`, run `npm run build` and deploy!
