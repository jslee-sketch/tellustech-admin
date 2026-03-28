from sqlalchemy import Column, Integer, String, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user")
    name = Column(String(100), nullable=False)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    contact = Column(String(100))
    phone = Column(String(50))
    status = Column(String(20), default="active")

    assets = relationship("Asset", back_populates="customer")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    sn = Column(String(100), unique=True, index=True)
    barcode = Column(String(100))
    name = Column(String(200), nullable=False)
    category = Column(String(50))
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)

    customer = relationship("Customer", back_populates="assets")


class RentalOA(Base):
    __tablename__ = "rental_oa"

    id = Column(Integer, primary_key=True, index=True)
    contract_no = Column(String(100), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    start = Column(Date, nullable=False)
    end = Column(Date)
    status = Column(String(20), default="active")

    customer = relationship("Customer")
    asset = relationship("Asset")


class RentalTM(Base):
    __tablename__ = "rental_tm"

    id = Column(Integer, primary_key=True, index=True)
    contract_no = Column(String(100), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    start = Column(Date, nullable=False)
    end = Column(Date)
    status = Column(String(20), default="active")

    customer = relationship("Customer")
    asset = relationship("Asset")


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    type = Column(String(20), nullable=False)  # in / out
    reason = Column(String(200))
    date = Column(Date, nullable=False)
    handler = Column(String(100))

    asset = relationship("Asset")


class Calibration(Base):
    __tablename__ = "calibration"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    date = Column(Date, nullable=False)
    cert_no = Column(String(100))
    status = Column(String(20), default="pending")

    asset = relationship("Asset")
    customer = relationship("Customer")


class ASDispatch(Base):
    __tablename__ = "as_dispatch"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    date = Column(Date, nullable=False)
    issue = Column(String(500))
    status = Column(String(20), default="received")

    asset = relationship("Asset")
    customer = relationship("Customer")
