create database if not exists nit_document_portal;
use nit_document_portal;

create table if not exists users (
  id varchar(64) primary key,
  name varchar(120) not null,
  email varchar(160) not null unique,
  password_hash varchar(255) not null,
  role enum('student', 'admin', 'dean') not null,
  register_number varchar(40),
  department varchar(80),
  year varchar(30),
  phone varchar(20),
  created_at timestamp not null default current_timestamp
);

create table if not exists applications (
  id varchar(32) primary key,
  student_id varchar(64) not null,
  full_name varchar(120) not null,
  register_number varchar(40) not null,
  department varchar(80) not null,
  year varchar(30) not null,
  email varchar(160) not null,
  phone varchar(20) not null,
  document_type enum('Transcript', 'Marksheet', 'Fee Receipt', 'Bonafide Certificate', 'Transfer Certificate') not null,
  purpose text not null,
  additional_notes text,
  status enum('pending', 'under_review', 'approved', 'rejected') not null default 'under_review',
  payment_status enum('pending', 'paid', 'failed') not null default 'paid',
  amount decimal(10, 2) not null,
  admin_remarks text,
  created_at datetime not null,
  updated_at datetime not null,
  constraint fk_applications_student foreign key (student_id) references users(id) on delete cascade
);

create table if not exists payments (
  id varchar(80) primary key,
  application_id varchar(32) not null,
  payment_id varchar(120) not null,
  order_id varchar(120),
  amount decimal(10, 2) not null,
  status enum('paid', 'failed', 'refunded') not null,
  created_at datetime not null,
  constraint fk_payments_application foreign key (application_id) references applications(id) on delete cascade
);

create table if not exists documents (
  id varchar(80) primary key,
  application_id varchar(32) not null,
  type enum('receipt', 'approved') not null default 'approved',
  file_name varchar(255) not null,
  file_url varchar(500) not null,
  uploaded_at datetime not null,
  constraint fk_documents_application foreign key (application_id) references applications(id) on delete cascade
);

create index idx_applications_student_id on applications(student_id);
create index idx_applications_status on applications(status);
create index idx_applications_department on applications(department);
create index idx_payments_application_id on payments(application_id);
create index idx_documents_application_id on documents(application_id);
