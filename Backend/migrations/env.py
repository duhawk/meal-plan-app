import logging
import os
import sys # Added import
from logging.config import fileConfig

# Add the 'Backend' directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import db # Import db from your database.py
from alembic import context
from app import app # Import the Flask app to push context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(config.config_file_name)
logger = logging.getLogger('alembic.env')

# Use app.app_context to set the database connection
with app.app_context():
    # Set the sqlalchemy.url directly from the environment variable
    config.set_main_option('sqlalchemy.url', os.getenv('DATABASE_URL'))
    
    # get the Alembic target_metadata from your db object
    target_metadata = db.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def get_metadata():
    return target_metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url, target_metadata=get_metadata(), literal_binds=True
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    # this callback is used to prevent an auto-migration from being generated
    # when there are no changes to the schema
    # reference: http://alembic.zzzcomputing.com/en/latest/cookbook.html
    def process_revision_directives(context, revision, directives):
        if getattr(config.cmd_opts, 'autogenerate', False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info('No changes in schema detected.')

    # Ensure app context is pushed for Flask-Migrate's configure_args
    with app.app_context():
        # From Flask-Migrate's env.py
        # noinspection PyUnresolvedReferences
        conf_args = app.extensions['migrate'].configure_args

    if conf_args.get("process_revision_directives") is None:
        conf_args["process_revision_directives"] = process_revision_directives

    # Use the SQLAlchemy engine directly from the db object
    with app.app_context(): # Added context manager here
        connectable = db.engine

        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=get_metadata(),
                **conf_args
            )

            with context.begin_transaction():
                context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
