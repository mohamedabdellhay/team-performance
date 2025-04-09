# Employee Performance Tracker

## 📌 Overview

A comprehensive web-based tool for tracking and analyzing employee performance metrics with:

- **Data Entry Interface**: Record daily performance metrics
- **Analytics Dashboard**: Visualize and analyze performance data
- **Responsive Design**: Works on desktop, tablet, and mobile devices

![App Screenshot](https://via.placeholder.com/800x450?text=Performance+Tracker+Screenshot)

## ✨ Features

### Data Entry Module

✔️ Add daily performance records for employees  
✔️ Track products completed, quality ratings, and errors  
✔️ Input validation for data integrity  
✔️ Responsive form design

### Analytics Dashboard

📊 Interactive charts and visualizations  
🔍 Filter data by date range, employee, and metrics  
📈 Performance trend analysis  
📥 Export data as JSON

### Technical Features

💻 Pure HTML/CSS/JavaScript solution  
🌐 No backend required (uses browser localStorage)  
📱 Fully responsive design

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Edge, Safari)
- No server required - runs completely client-side

### Installation

1. Clone the repository or download the ZIP file
   ```bash
   git clone https://github.com/yourusername/employee-performance-tracker.git
   ```
2. Navigate to the project directory
3. Open `index.html` in your browser

### File Structure

```
employee-performance-tracker/
├── index.html            # Landing page
├── data-entry.html       # Data entry interface
├── dashboard.html        # Analytics dashboard
├── README.md             # This file
└── assets/               # Optional assets folder
    ├── css/
    │   └── styles.css    # Consolidated CSS (optional)
    └── js/
        └── scripts.js    # Consolidated JS (optional)
```

## 🛠️ Usage

### Data Entry

1. Open `data-entry.html`
2. Fill in the form with:
   - Date
   - Employee name
   - Number of products completed
   - Quality rating (1-10)
   - Number of errors
3. Click "Save" to store the record

### Analytics Dashboard

1. Open `dashboard.html`
2. View automatically generated charts:
   - Productivity by employee
   - Quality ratings
   - Error distribution
   - Performance trends
3. Use filters to focus on specific data
4. Export data as JSON when needed

## 📚 Data Structure

Records are stored in the following format:

```json
[
  {
    "date": "2023-07-15",
    "member": "John Doe",
    "products": 12,
    "quality": 8,
    "errors": 2
  }
]
```

## 🌐 Browser Support

| Browser | Supported |
| ------- | --------- |
| Chrome  | ✅ Yes    |
| Firefox | ✅ Yes    |
| Safari  | ✅ Yes    |
| Edge    | ✅ Yes    |
| IE 11   | ❌ No     |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Contact

Project Maintainer - [mohamedabdellhay](mailto:mohamedabdellhay1@gmail.com)

Project Link: [team-performance.netlify.app](https://team-performance.netlify.app/)

---

Made with ❤️ by [mohamedabdellhay]
