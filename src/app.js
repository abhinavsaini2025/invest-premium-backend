const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const config = require('./config/env');
const routes = require('./routes');
const swaggerSpec = require('./docs/swagger');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const ApiResponse = require('./utils/ApiResponse');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize()); // strips any $ / . operators out of req.body/query/params

if (config.env !== 'test') {
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
}

// Static file serving for uploaded profile photos
app.use('/uploads', express.static(path.join(process.cwd(), config.uploads.dir)));

app.get('/health', (req, res) => {
  new ApiResponse(200, { uptime: process.uptime() }, 'OK').send(res);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(config.apiBasePath, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
