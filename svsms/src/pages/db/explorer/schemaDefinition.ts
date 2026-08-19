export const dbSchemaDefinition = [
  {
    name: 'Customer',
    storeKey: 'customers',
    description: 'Stores customer personal and contact information.',
    columns: [
      { name: 'id', type: 'VARCHAR(50)', isPrimaryKey: true, isForeignKey: false, nullable: false, description: 'Unique identifier for customer' },
      { name: 'first_name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Customer first name' },
      { name: 'last_name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Customer last name' },
      { name: 'email', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Contact email address' },
      { name: 'phone', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Contact phone number' },
      { name: 'address', type: 'TEXT', isPrimaryKey: false, isForeignKey: false, nullable: true, description: 'Residential address' },
      { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Record creation timestamp' },
    ]
  },
  {
    name: 'Vehicle',
    storeKey: 'vehicles',
    description: 'Stores vehicle details linked to customers.',
    columns: [
      { name: 'id', type: 'VARCHAR(50)', isPrimaryKey: true, isForeignKey: false, nullable: false, description: 'Unique identifier for vehicle' },
      { name: 'customer_id', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: true, references: 'Customer(id)', nullable: false, description: 'Owner of the vehicle' },
      { name: 'make', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Vehicle manufacturer' },
      { name: 'model', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Vehicle model' },
      { name: 'year', type: 'INT', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Manufacturing year' },
      { name: 'license_plate', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Registration number' },
      { name: 'vin', type: 'VARCHAR(30)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Vehicle Identification Number' },
      { name: 'color', type: 'VARCHAR(30)', isPrimaryKey: false, isForeignKey: false, nullable: true, description: 'Vehicle color' },
      { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Record creation timestamp' },
    ]
  },
  {
    name: 'Mechanic',
    storeKey: 'mechanics',
    description: 'Stores staff details for mechanics.',
    columns: [
      { name: 'id', type: 'VARCHAR(50)', isPrimaryKey: true, isForeignKey: false, nullable: false, description: 'Unique identifier' },
      { name: 'first_name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Mechanic first name' },
      { name: 'last_name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Mechanic last name' },
      { name: 'phone', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Contact phone' },
      { name: 'email', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Contact email' },
      { name: 'specialization', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, nullable: true, description: 'Area of expertise' },
      { name: 'hire_date', type: 'DATE', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Employment start date' },
      { name: 'status', type: 'ENUM', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'active, on_leave, terminated' },
    ]
  },
  {
    name: 'Appointment',
    storeKey: 'appointments',
    description: 'Service booking records.',
    columns: [
      { name: 'id', type: 'VARCHAR(50)', isPrimaryKey: true, isForeignKey: false, nullable: false, description: 'Unique identifier' },
      { name: 'customer_id', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: true, references: 'Customer(id)', nullable: false, description: 'Customer booking the service' },
      { name: 'vehicle_id', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: true, references: 'Vehicle(id)', nullable: false, description: 'Vehicle to be serviced' },
      { name: 'date', type: 'DATE', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Scheduled date' },
      { name: 'time', type: 'TIME', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Scheduled time' },
      { name: 'status', type: 'ENUM', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'scheduled, in_progress, completed, cancelled' },
      { name: 'notes', type: 'TEXT', isPrimaryKey: false, isForeignKey: false, nullable: true, description: 'Service description/complaint' },
      { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Booking creation time' },
    ]
  },
  {
    name: 'Spare_Part',
    storeKey: 'spareParts',
    description: 'Master list of all spare parts.',
    columns: [
      { name: 'id', type: 'VARCHAR(50)', isPrimaryKey: true, isForeignKey: false, nullable: false, description: 'Unique identifier' },
      { name: 'name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Part name' },
      { name: 'part_number', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Manufacturer part number' },
      { name: 'manufacturer', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Brand/Manufacturer' },
      { name: 'unit_price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Selling price' },
      { name: 'description', type: 'TEXT', isPrimaryKey: false, isForeignKey: false, nullable: true, description: 'Details about part' },
    ]
  },
  {
    name: 'Inventory',
    storeKey: 'inventory',
    description: 'Current stock levels for parts.',
    columns: [
      { name: 'id', type: 'VARCHAR(50)', isPrimaryKey: true, isForeignKey: false, nullable: false, description: 'Unique identifier' },
      { name: 'part_id', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: true, references: 'Spare_Part(id)', nullable: false, description: 'The part in inventory' },
      { name: 'quantity_in_stock', type: 'INT', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Current available units' },
      { name: 'reorder_level', type: 'INT', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Threshold to trigger restock' },
      { name: 'last_restock_date', type: 'DATE', isPrimaryKey: false, isForeignKey: false, nullable: false, description: 'Last delivery date' },
      { name: 'location', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, nullable: true, description: 'Warehouse location / Aisle' },
    ]
  }
];
