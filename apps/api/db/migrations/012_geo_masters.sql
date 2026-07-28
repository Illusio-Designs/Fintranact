-- 012_geo_masters — reference data for state & city dropdowns.
-- States are keyed by the official 2-digit GST state code; cities focus on Gujarat
-- (the client operates only in Rajkot) with the major Gujarat towns seeded.

CREATE TABLE IF NOT EXISTS states (
  code  VARCHAR(2)  PRIMARY KEY,          -- GST state code
  name  VARCHAR(60) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cities (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  state_code  VARCHAR(2)  NOT NULL,
  name        VARCHAR(80) NOT NULL,
  CONSTRAINT fk_city_state FOREIGN KEY (state_code) REFERENCES states(code),
  UNIQUE KEY uq_city (state_code, name),
  INDEX idx_city_state (state_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO states (code, name) VALUES
 ('01','Jammu & Kashmir'), ('02','Himachal Pradesh'), ('03','Punjab'), ('04','Chandigarh'),
 ('05','Uttarakhand'), ('06','Haryana'), ('07','Delhi'), ('08','Rajasthan'),
 ('09','Uttar Pradesh'), ('10','Bihar'), ('11','Sikkim'), ('12','Arunachal Pradesh'),
 ('13','Nagaland'), ('14','Manipur'), ('15','Mizoram'), ('16','Tripura'),
 ('17','Meghalaya'), ('18','Assam'), ('19','West Bengal'), ('20','Jharkhand'),
 ('21','Odisha'), ('22','Chhattisgarh'), ('23','Madhya Pradesh'), ('24','Gujarat'),
 ('26','Dadra & Nagar Haveli and Daman & Diu'), ('27','Maharashtra'), ('28','Andhra Pradesh (Old)'),
 ('29','Karnataka'), ('30','Goa'), ('31','Lakshadweep'), ('32','Kerala'),
 ('33','Tamil Nadu'), ('34','Puducherry'), ('35','Andaman & Nicobar Islands'),
 ('36','Telangana'), ('37','Andhra Pradesh'), ('38','Ladakh'), ('97','Other Territory');

-- Gujarat (24) cities — the client's operating state.
INSERT IGNORE INTO cities (state_code, name) VALUES
 ('24','Rajkot'), ('24','Ahmedabad'), ('24','Surat'), ('24','Vadodara'),
 ('24','Bhavnagar'), ('24','Jamnagar'), ('24','Gandhinagar'), ('24','Junagadh'),
 ('24','Morbi'), ('24','Gondal'), ('24','Jetpur'), ('24','Anand'),
 ('24','Nadiad'), ('24','Mehsana'), ('24','Bharuch'), ('24','Navsari'),
 ('24','Porbandar'), ('24','Surendranagar'), ('24','Veraval'), ('24','Palanpur');

-- A handful of common metros in other states for interstate parties.
INSERT IGNORE INTO cities (state_code, name) VALUES
 ('27','Mumbai'), ('27','Pune'), ('27','Nagpur'),
 ('07','New Delhi'), ('29','Bengaluru'), ('33','Chennai'),
 ('09','Kanpur'), ('19','Kolkata'), ('36','Hyderabad'), ('08','Jaipur');
