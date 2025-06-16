# 🐕 Dog Trial Management System

A comprehensive web-based system for managing dog agility and sporting trials. Built with vanilla HTML, CSS, and JavaScript for easy deployment on GitHub Pages or any web hosting platform.

## ✨ Features

### 🏆 Trial Management
- **Multi-day trial configuration** with flexible class and round scheduling
- **Judge assignment** and time management
- **Trial dashboard** with overview and statistics
- **Public entry forms** with shareable links

### 📝 Entry Management
- **Typeahead search** for registered dogs
- **Real-time validation** of registration numbers
- **Multiple trial selection** in a single entry
- **FEO (For Exhibition Only)** entry support

### 📊 Score Management
- **Digital score entry** with automatic placement calculation
- **Printable score sheets** for judges
- **Running order generation** with drag-and-drop reordering
- **Export capabilities** (CSV, JSON)

### 🎯 User Experience
- **Responsive design** works on desktop, tablet, and mobile
- **Progressive enhancement** with offline capabilities
- **Clean, modern interface** with intuitive navigation
- **Real-time feedback** and status messages

## 🚀 Quick Start

### GitHub Pages Deployment

1. **Fork this repository** or download as ZIP
2. **Upload your dog data** to `assets/data/dogs.json`
3. **Enable GitHub Pages** in repository settings
4. **Access your site** at `https://yourusername.github.io/repository-name`

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dog-trial-management.git
   cd dog-trial-management
   ```

2. **Serve locally** (Python example)
   ```bash
   python -m http.server 8000
   ```

3. **Open browser** to `http://localhost:8000`

## 📁 File Structure

```
dog-trial-management/
├── index.html                 # Main dashboard
├── entry-form.html           # Public entry form
├── assets/
│   ├── css/
│   │   ├── main.css          # Global styles
│   │   ├── forms.css         # Form-specific styles
│   │   ├── tables.css        # Tables and score sheets
│   │   └── responsive.css    # Mobile responsiveness
│   ├── js/
│   │   ├── core/
│   │   │   ├── app.js        # Main application logic
│   │   │   ├── storage.js    # Data storage management
│   │   │   └── utils.js      # Utility functions
│   │   └── components/
│   │       ├── trial-setup.js    # Trial configuration
│   │       ├── entry-form.js     # Entry form handling
│   │       ├── score-sheets.js   # Score management
│   │       ├── running-order.js  # Running order
│   │       └── exports.js        # Data export
│   └── data/
│       └── dogs.json         # Dog registration database
├── README.md                 # This file
└── LICENSE                   # MIT License
```

## 🔧 Configuration

### Dog Data Setup

Replace the sample data in `assets/data/dogs.json` with your actual dog registrations:

```json
[
  {
    "registration": "DOG001",
    "callName": "Max",
    "handler": "John Smith",
    "class": "Agility 1",
    "judges": "Jane Doe"
  }
]
```

### Required Fields
- **registration**: Unique identifier for the dog
- **callName**: Dog's call name for competition
- **handler**: Handler's full name
- **class**: Default class (can be overridden in trial setup)
- **judges**: Preferred or qualified judges

## 📋 Usage Guide

### Creating a Trial

1. **Go to Setup Trial** tab in the dashboard
2. **Enter trial name** and select number of days
3. **Configure each day** with:
   - Date
   - Classes and rounds
   - Judge assignments
   - Start times
4. **Save trial** to generate entry form link

### Managing Entries

1. **Share the entry form link** with participants
2. **Monitor entries** in the Manage Entries tab
3. **Generate running orders** automatically or manually arrange
4. **Export data** as needed for trial secretary

### Score Entry

1. **Select class and round** from the digital score entry
2. **Enter scores** for each competitor
3. **Automatic placement calculation** based on scores
4. **Print score sheets** for official records

## 🎨 Customization

### Styling
- Modify CSS files in `assets/css/` for visual customization
- Color scheme defined in CSS custom properties
- Responsive breakpoints configurable in `responsive.css`

### Functionality
- Add new features by creating components in `assets/js/components/`
- Extend data structure by modifying storage functions
- Customize validation rules in utility functions

## 🔒 Data Storage

- **Local Storage**: All data stored in browser's localStorage
- **No server required**: Fully client-side operation
- **Data persistence**: Data survives browser sessions
- **Export/Import**: Backup capabilities built-in

### Privacy
- No data transmitted to external servers
- All processing happens locally in the browser
- Suitable for sensitive competition data

## 🌐 Browser Compatibility

- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **Mobile browsers**: iOS Safari, Chrome Mobile
- **Minimum requirements**: ES6 support, localStorage
- **Progressive enhancement**: Graceful degradation for older browsers

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

### Development Guidelines
- Follow existing code style and structure
- Add comments for complex functionality
- Test on multiple browsers and screen sizes
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Data not saving?**
- Check if localStorage is enabled in browser
- Verify sufficient storage space available
- Try clearing browser cache and refreshing

**Entry form not loading?**
- Ensure trial has been saved and made public
- Check URL parameters are correct
- Verify dogs.json file is accessible

**Mobile display issues?**
- Clear browser cache
- Ensure viewport meta tag is present
- Check responsive CSS is loading

### Getting Help

- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check wiki for detailed guides

## 🙏 Acknowledgments

- Built for the dog agility and sporting community
- Inspired by trial secretaries and organizers worldwide
- Designed with input from judges and competitors

---

**Made with ❤️ for dog sports enthusiasts**

*This system has been tested with real trial data and is actively used by trial organizers. It provides a complete solution for managing everything from entries to final results.*

## 🎯 Quick Demo

Try the system with sample data:
1. Visit the [live demo](https://yourusername.github.io/dog-trial-management)
2. Create a sample trial in "Setup Trial"
3. Use the generated entry form link
4. Enter sample registrations (DOG001-DOG020)
5. Generate running orders and enter scores

## 📞 Contact

- **GitHub**: [@yourusername](https://github.com/yourusername)
- **Issues**: [Project Issues](https://github.com/yourusername/dog-trial-management/issues)
- **Email**: your.email@example.com

## 🗺️ Roadmap

### Version 2.0 (Planned)
- [ ] Cloud sync capabilities
- [ ] Advanced reporting features
- [ ] Integration with kennel club databases
- [ ] Mobile app companion
- [ ] Multi-language support

### Current Version: 1.0.0
- [x] Complete trial management
- [x] Public entry forms
- [x] Digital scoring
- [x] Export capabilities
- [x] Responsive design