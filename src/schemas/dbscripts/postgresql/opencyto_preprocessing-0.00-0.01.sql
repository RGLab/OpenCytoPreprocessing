DROP SCHEMA IF EXISTS opencyto_preprocessing CASCADE;
CREATE SCHEMA opencyto_preprocessing;

CREATE TABLE opencyto_preprocessing.projections
(
    Container       ENTITYID NOT NULL,
    name                TEXT NOT NULL,
    path                TEXT NOT NULL,
    x_axis              TEXT NOT NULL,
    y_axis              TEXT NOT NULL,

--     CONSTRAINT UQ_table UNIQUE (Container, <cols-list>), -- cols combination to make unique to the project
    CONSTRAINT PK_projections PRIMARY KEY (Container, name, x_axis, y_axis)
);
