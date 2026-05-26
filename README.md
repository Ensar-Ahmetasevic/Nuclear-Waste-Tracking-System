# 🌍 Nuclear Waste Tracking System (NWTS)  
*Real-time Nuclear Waste Monitoring Platform*  

![NWTS Architecture Diagram](https://via.placeholder.com/800x400.png?text=IWTS+System+Architecture)  
*(Replace with your architecture diagram screenshot)*  

## 🎯 Overview  
NWTS is a digital platform developed for secure tracking, analysis, and management of nuclear waste. The project combines IoT sensors, multi-level security, and geolocation to reduce environmental risks and enable organizations to:  
- Automate waste documentation in compliance with international standards (IAEA).  
- Detect anomalies in real time.  
- Generate audit reports for regulatory bodies.  

**Status**: Beta version (70% complete)  

---

## ✨ Key Features  
| Module         | Technologies               | Description                                                         |
|----------------|----------------------------|---------------------------------------------------------------------|
| **Auth**       | NextAuth, Bcrypt           | Role-based access (Admin, Supervisor, Worker) with JWT encryption. |
| **Dashboard**  | React Query, Recharts      | Interactive data visualization via maps, heatmaps, and trend lines.|
| **Waste API**  | Prisma, PostgreSQL         | REST/GraphQL endpoints for CRUD operations on 10+ waste types.     |
| **Storage**    | AWS S3, Presigned URLs     | Encrypted document storage (PDF certificates, invoices).           |
| **Forms**      | React Hook Form            | Validation for 50+ input fields with dynamic dependencies.         |

---

## 🛠️ Tech Stack  
**Frontend**:  
- Next.js 14 (App Router)  
- TailwindCSS + daisyUI  
- React Query v5  
- React Hook Form  

**Backend**:  
- Node.js + Express  
- PostgreSQL + Prisma ORM  
- NextAuth.js  

**DevOps**:  
- AWS S3 
- GitHub Actions (CI/CD)  

---

## 🚀 Installation (Development)  
1. Clone the repo:  
   ```bash
   git clone https://github.com/your-username/IWTS.git
