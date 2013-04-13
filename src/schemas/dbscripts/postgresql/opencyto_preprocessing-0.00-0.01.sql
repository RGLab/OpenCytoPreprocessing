DROP SCHEMA IF EXISTS opencyto_preprocessing CASCADE;
CREATE SCHEMA opencyto_preprocessing;

CREATE TABLE opencyto_preprocessing.gsTbl
(
    Container     ENTITYID  NOT NULL,
    gsId          INT       NOT NULL,
    gsName        TEXT      NOT NULL,
    objLink       TEXT      NOT NULL,
    gsDescription TEXT,
    xmlPath       TEXT      NOT NULL,
    sampleGroup   TEXT      NOT NULL,
    created       TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT PK_gsTbl PRIMARY KEY (gsId, Container)
);

CREATE TABLE opencyto_preprocessing.projections
(
    Container ENTITYID  NOT NULL,
    name      TEXT      NOT NULL,
    path      TEXT      NOT NULL,
    x_axis    TEXT      NOT NULL,
    y_axis    TEXT      NOT NULL,
    x_key     TEXT      NOT NULL,
    y_key     TEXT      NOT NULL,
    gsId      INT       NOT NULL,

--     CONSTRAINT UQ_table UNIQUE (Container, <cols-list>), -- cols combination to make unique to the project
    CONSTRAINT PK_projections PRIMARY KEY (Container, name, x_axis, y_axis, gsId),
    CONSTRAINT FK_projections_gsTbl FOREIGN KEY (gsId, Container)
        REFERENCES opencyto_preprocessing.gsTbl (gsId, Container)
        ON DELETE CASCADE
);

CREATE TABLE opencyto_preprocessing.study_vars
(
    Container ENTITYID NOT NULL,
    svId      SERIAL   NOT NULL,
    svName    TEXT     NOT NULL,
    gsId      INT      NOT NULL,

    CONSTRAINT PK_study_vars PRIMARY KEY (svId, Container),
    CONSTRAINT FK_study_vars_gsTbl FOREIGN KEY (gsId, Container)
        REFERENCES opencyto_preprocessing.gsTbl (gsId, Container)
        ON DELETE CASCADE
);

CREATE TABLE opencyto_preprocessing.files
(
    Container ENTITYID  NOT NULL,
    fileId    INT       NOT NULL,
    gsId      INT       NOT NULL,

    CONSTRAINT PK_files PRIMARY KEY (fileId, Container, gsId),
    CONSTRAINT FK_files_gsTbl FOREIGN KEY (gsId, Container)
        REFERENCES opencyto_preprocessing.gsTbl (gsId, Container)
        ON DELETE CASCADE
);
