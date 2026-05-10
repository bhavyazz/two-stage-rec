# Elder Care & Nutrition Management System

A full-stack healthcare application for managing elder care, nutrition planning, pantry inventory, and recipe recommendations with AI-powered ingredient substitution using machine learning.

##  Features

- **User Authentication**: Secure login with JWT tokens and role-based access control
- **Elder Management**: Track and manage information about elders in your care
- **Nutrition Tracking**: Log and monitor daily nutrition intake and dietary requirements
- **Pantry Inventory**: Keep track of available ingredients and pantry items
- **Recipe Management**: Browse, manage, and recommend recipes based on available ingredients
- **OCR Integration**: Extract recipe information from photos using OCR
- **AI-Powered Ingredient Substitution**: Use machine learning to suggest ingredient substitutions based on nutritional similarity and dietary requirements
- **Spoonacular Integration**: Access a vast recipe database with detailed nutrition information
- **Real-time Sync**: Cross-user data isolation with real-time synchronization

##  Project Structure

```
project1/
├── src/                    # React frontend
│   ├── components/         # Reusable React components
│   ├── pages/             # Page components
│   ├── api/               # API client utilities
│   ├── App.jsx
│   └── main.jsx
├── server/                # Node.js backend
│   ├── routes/            # API route definitions
│   ├── controllers/        # Request handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Authentication, logging
│   ├── ocr/              # OCR processing
│   └── index.js
├── ml/                    # Python ML service
│   ├── train_ltr.py      # Training script for LightGBM
│   ├── infer_service.py  # Inference API service
│   ├── feature_utils.py  # Feature engineering
│   └── data/             # Training data
└── sql/                   # Database setup scripts
```

##  Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **PostgreSQL** (v12 or higher)
- **pip** (Python package manager)

## Installation

### 1. Clone & Setup Frontend

```bash
cd d:/finaldbms/project1
npm install
```

### 2. Setup Backend Server

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your_jwt_secret_key
PORT=5000
SPOONACULAR_API_KEY=your_spoonacular_key
```

### 3. Setup ML Service

```bash
cd ml
python -m venv venv
venv\Scripts\activate  # On Windows
# or: source venv/bin/activate  # On macOS/Linux

pip install -r requirements.txt
```

### 4. Database Setup

Create database and run migration scripts:

```bash
# In PostgreSQL
createdb elder_care

# Run SQL setup scripts
psql -U postgres -d elder_care -f ../sql/create_nutrition_table.sql
psql -U postgres -d elder_care -f ../sql/create_pantry_table.sql
psql -U postgres -d elder_care -f ../sql/add_user_id_to_elder.sql
```

##  Running the Application

### Terminal 1: Frontend (Vite Dev Server)

```bash
cd d:/finaldbms/project1
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Terminal 2: Backend Server

```bash
cd server
npm start
# or: node index.js
```

The backend API will run on `http://localhost:5000`

### Terminal 3: ML Service (Optional, for ingredient substitution)

```bash
cd ml
python infer_service.py
```

The ML inference service will run on `http://localhost:8000`

##  API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Elders Management
- `GET /api/elders` - List all elders
- `POST /api/elders` - Create new elder
- `PUT /api/elders/:id` - Update elder
- `DELETE /api/elders/:id` - Delete elder

### Nutrition
- `GET /api/nutrition` - Get nutrition logs
- `POST /api/nutrition` - Log nutrition entry
- `GET /api/nutrition/analysis` - Get nutrition analysis

### Pantry
- `GET /api/pantry` - List pantry items
- `POST /api/pantry` - Add item to pantry
- `DELETE /api/pantry/:id` - Remove pantry item

### Recipes
- `GET /api/recipes` - Get recipes
- `POST /api/recipes/search` - Search recipes
- `POST /api/recipes/substitutions` - Get ingredient substitutions (ML-powered)

### OCR
- `POST /api/receipts/ocr` - Extract text from recipe photo

##  ML Model - Ingredient Substitution

The system uses **LightGBM (Light Gradient Boosting Machine)** for ingredient substitution recommendations.

### Training

```bash
cd ml
python train_ltr.py
```

This creates a ranking model that learns nutritional similarity between ingredients.

### Making Predictions

```bash
python infer_service.py
```

The service provides REST API for real-time ingredient substitution predictions.

##  Security Features

- **JWT Authentication**: Token-based authentication for API requests
- **Password Hashing**: Passwords stored with bcrypt hashing
- **User Isolation**: Each user only sees their own data
- **Environment Variables**: Sensitive keys stored in `.env`
- **CORS**: Configured for secure cross-origin requests

##  Technology Stack

**Frontend:**
- React with Vite
- Modern JavaScript (ES6+)

**Backend:**
- Node.js with Express
- PostgreSQL for data persistence
- JWT for authentication

**ML:**
- Python
- LightGBM for ranking/regression
- scikit-learn for feature engineering

##  Troubleshooting

- **Database connection error**: Ensure PostgreSQL is running and `.env` credentials are correct
- **Port already in use**: Change PORT in `.env` or kill the process using the port
- **Python venv issues**: Delete `venv/` folder and recreate it
- **Module not found errors**: Run `npm install` and `pip install -r requirements.txt` again


