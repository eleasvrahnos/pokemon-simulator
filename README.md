Personal Info
	Name: Eleas Vrahnos
	ID: 2378876
	Email: evrahnos@chapman.edu
	Course: CPSC-408-01

General Description:
	This is a final project created for the Database Management course at Chapman University. It employs common techniques used to access, modify, and update databases, and demonstrates general knowledge of MySQL. The final project is essentially a barebones automatic simulator for the games in the Pokémon series, with  phases simulating catching and fighting. More info about how the simulation works can be found within the simulation tutorial text. There are no known runtime errors, but if errors do arise, don't hesitate to reach out about it with the above email.

Contents of zip file
	- /static: folder that contains the JS (scripts) and CSS (styles) files for the website
	- /templates: folder that contains the HTML (web frontend) file for the website
	- app.py: Python file that uses Flask to run the backend
	- BaseDump.sql: an all-in-one SQL file that contains the base content dump of the needed database schema
	- MidProgressPresentation.pptx: a presentation that showcases the progress on the project halfway through development
	- ProjectRunthrough.mp4: a video runthrough of the basic functions and look of the website in action
	- README.md: provides an overview of the project and instructions for running

Instructions to run Pokémon Simulator
	1) Get necessary imports within app.py (via pip/sudo/etc.)
		- flask
		- sqlalchemy
		- pandas
	1) Initialize the database schema
		- Download the contents of BaseDump.sql by running the SQL script, through a workbench or some other means
		- After running the script, ensure that the database 'pokemon' now exists and that its 5 entities (gyms, moves, pokemon, trainers, types) exist
	2) Configure app.py to the database location
		- Line 7-8 in app.py allows Flask to connect to the database using the SQLAlchemy module
		- Change the path variable in Line 7 as needed so that the program can access the database on your device
		- For more information on how the SQLAlchemy module works, see https://www.geeksforgeeks.org/connecting-to-sql-database-using-sqlalchemy-in-python/#
	3) Run app.py in a command line
		- While in the project folder, run the backend Python file with the command 'python app.py'
		- Certain devices may require another command, such as 'python3 app.py'
		- If successful, many lines running the backend should appear, with one line being similar to "Running on http://127.0.0.1:5000" 
		- To access this locally-run website, visit the link given in that line
		- To stop running the website, it must be manually interrupted (Ctrl+C in Windows)
		