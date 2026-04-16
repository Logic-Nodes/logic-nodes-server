const jsonResponse = (description, schema) => ({
  description,
  content: {
    'application/json': {
      schema
    }
  }
});

const noContentResponse = (description = 'No Content') => ({
  description
});

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const arrayOf = (schema) => ({
  type: 'array',
  items: schema
});

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'LogicNodes API',
    version: '1.0.0',
    description: 'OpenAPI documentation for the Node.js migration of the LogicNodes backend.'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server'
    }
  ],
  tags: [
    { name: 'Health' },
    { name: 'IAM' },
    { name: 'Trips' },
    { name: 'Origin Points' },
    { name: 'Delivery Orders' },
    { name: 'Alerts' },
    { name: 'Incidents' },
    { name: 'Notifications' },
    { name: 'Dashboard' },
    { name: 'Fleet Devices' },
    { name: 'Fleet Vehicles' },
    { name: 'Monitoring' },
    { name: 'Telemetry' },
    { name: 'Merchants' },
    { name: 'Employees' },
    { name: 'Profiles' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: jsonResponse('OK', ref('HealthResponse'))
        }
      }
    },
    '/api/v1/authentication/sign-in': {
      post: {
        tags: ['IAM'],
        summary: 'Sign in',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('SignInRequest')
            }
          }
        },
        responses: {
          200: jsonResponse('Signed in', ref('TokenPair')),
          401: jsonResponse('Unauthorized', ref('ErrorResponse'))
        }
      }
    },
    '/api/v1/authentication/sign-up': {
      post: {
        tags: ['IAM'],
        summary: 'Sign up',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('SignUpRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('User')),
          400: jsonResponse('Bad Request', ref('ErrorResponse')),
          409: jsonResponse('Conflict', ref('ErrorResponse'))
        }
      }
    },
    '/api/v1/authentication/verify-token': {
      post: {
        tags: ['IAM'],
        summary: 'Verify access token',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: ref('VerifyTokenRequest')
            }
          }
        },
        parameters: [
          {
            in: 'header',
            name: 'Authorization',
            schema: { type: 'string' },
            required: false,
            description: 'Bearer access token'
          }
        ],
        responses: {
          200: jsonResponse('Verified', ref('User')),
          401: jsonResponse('Unauthorized', ref('ErrorResponse'))
        }
      }
    },
    '/api/v1/authentication/refresh': {
      post: {
        tags: ['IAM'],
        summary: 'Refresh tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('RefreshRequest')
            }
          }
        },
        responses: {
          200: jsonResponse('Refreshed', ref('TokenPair')),
          401: jsonResponse('Unauthorized', ref('ErrorResponse'))
        }
      }
    },
    '/api/v1/authentication/logout': {
      post: {
        tags: ['IAM'],
        summary: 'Logout current session',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: ref('LogoutRequest')
            }
          }
        },
        responses: {
          204: noContentResponse(),
          400: jsonResponse('Bad Request', ref('ErrorResponse')),
          401: jsonResponse('Unauthorized', ref('ErrorResponse'))
        }
      }
    },
    '/api/v1/authentication/logout-all': {
      post: {
        tags: ['IAM'],
        summary: 'Logout all sessions',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: ref('LogoutAllRequest')
            }
          }
        },
        parameters: [
          {
            in: 'header',
            name: 'Authorization',
            schema: { type: 'string' },
            required: false,
            description: 'Bearer access token'
          }
        ],
        responses: {
          204: noContentResponse(),
          401: jsonResponse('Unauthorized', ref('ErrorResponse'))
        }
      }
    },
    '/api/v1/roles': {
      get: {
        tags: ['IAM'],
        summary: 'List roles',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Role'))),
          401: jsonResponse('Unauthorized', ref('ErrorResponse'))
        }
      }
    },
    '/api/v1/users': {
      get: {
        tags: ['IAM'],
        summary: 'List users',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('User'))),
          401: jsonResponse('Unauthorized', ref('ErrorResponse'))
        }
      }
    },
    '/api/v1/users/{userId}': {
      get: {
        tags: ['IAM'],
        summary: 'Get user by id',
        parameters: [
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: jsonResponse('OK', ref('User')),
          404: noContentResponse('Not Found')
        }
      }
    },
    '/api/v1/trips': {
      get: {
        tags: ['Trips'],
        summary: 'List trips',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Trip')))
        }
      },
      post: {
        tags: ['Trips'],
        summary: 'Create trip',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateTripRequest')
            }
          }
        },
        responses: {
          201: noContentResponse('Created'),
          400: jsonResponse('Bad Request', ref('ErrorResponse'))
        }
      }
    },
    '/api/v1/trips/merchant/{merchantId}': {
      get: {
        tags: ['Trips'],
        summary: 'List trips by merchant',
        parameters: [
          { in: 'path', name: 'merchantId', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Trip')))
        }
      }
    },
    '/api/v1/trips/search': {
      get: {
        tags: ['Trips'],
        summary: 'Search trips',
        parameters: [
          { in: 'query', name: 'status', schema: { type: 'string' } },
          { in: 'query', name: 'merchantId', schema: { type: 'string' } }
        ],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Trip')))
        }
      }
    },
    '/api/v1/trips/{tripId}': {
      get: {
        tags: ['Trips'],
        summary: 'Get trip by id',
        parameters: [
          { in: 'path', name: 'tripId', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: jsonResponse('OK', ref('Trip')),
          404: noContentResponse('Not Found')
        }
      },
      delete: {
        tags: ['Trips'],
        summary: 'Delete trip',
        parameters: [
          { in: 'path', name: 'tripId', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: jsonResponse('OK', ref('Trip'))
        }
      }
    },
    '/api/v1/trips/{tripId}/start': {
      post: {
        tags: ['Trips'],
        summary: 'Start trip',
        parameters: [
          { in: 'path', name: 'tripId', required: true, schema: { type: 'string' } }
        ],
        responses: {
          204: noContentResponse('No Content')
        }
      }
    },
    '/api/v1/trips/{tripId}/complete': {
      post: {
        tags: ['Trips'],
        summary: 'Complete trip',
        parameters: [
          { in: 'path', name: 'tripId', required: true, schema: { type: 'string' } }
        ],
        responses: {
          204: noContentResponse('No Content')
        }
      }
    },
    '/api/v1/origin-points': {
      get: {
        tags: ['Origin Points'],
        summary: 'List origin points',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('OriginPoint')))
        }
      },
      post: {
        tags: ['Origin Points'],
        summary: 'Create origin point',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateOriginPointRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('OriginPoint'))
        }
      }
    },
    '/api/v1/origin-points/search': {
      get: {
        tags: ['Origin Points'],
        summary: 'Search origin points',
        parameters: [
          { in: 'query', name: 'name', schema: { type: 'string' } }
        ],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('OriginPoint')))
        }
      }
    },
    '/api/v1/origin-points/{id}': {
      get: {
        tags: ['Origin Points'],
        summary: 'Get origin point by id',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: jsonResponse('OK', ref('OriginPoint'))
        }
      },
      put: {
        tags: ['Origin Points'],
        summary: 'Update origin point',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('UpdateOriginPointRequest')
            }
          }
        },
        responses: {
          200: jsonResponse('OK', ref('OriginPoint'))
        }
      },
      delete: {
        tags: ['Origin Points'],
        summary: 'Delete origin point',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: jsonResponse('OK', ref('OriginPoint'))
        }
      }
    },
    '/api/v1/delivery-orders': {
      get: {
        tags: ['Delivery Orders'],
        summary: 'List delivery orders',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('DeliveryOrder')))
        }
      },
      post: {
        tags: ['Delivery Orders'],
        summary: 'Create delivery order',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateDeliveryOrderRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('DeliveryOrder'))
        }
      }
    },
    '/api/v1/delivery-orders/trip/{tripId}': {
      get: {
        tags: ['Delivery Orders'],
        summary: 'List delivery orders by trip',
        parameters: [
          { in: 'path', name: 'tripId', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('DeliveryOrder')))
        }
      }
    },
    '/api/v1/delivery-orders/{id}': {
      put: {
        tags: ['Delivery Orders'],
        summary: 'Update delivery order',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('UpdateDeliveryOrderRequest')
            }
          }
        },
        responses: {
          200: jsonResponse('OK', ref('DeliveryOrder'))
        }
      },
      delete: {
        tags: ['Delivery Orders'],
        summary: 'Delete delivery order',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: jsonResponse('OK', ref('DeliveryOrder'))
        }
      }
    },
    '/api/v1/delivery-orders/{id}/delivery': {
      post: {
        tags: ['Delivery Orders'],
        summary: 'Mark delivery order as delivered',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
        ],
        responses: {
          204: noContentResponse('No Content')
        }
      }
    },
    '/api/v1/alerts': {
      get: {
        tags: ['Alerts'],
        summary: 'List alerts',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Alert')))
        }
      },
      post: {
        tags: ['Alerts'],
        summary: 'Create alert',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateAlertRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('Alert'))
        }
      }
    },
    '/api/v1/alerts/type/{type}': {
      get: {
        tags: ['Alerts'],
        summary: 'List alerts by type',
        parameters: [{ in: 'path', name: 'type', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Alert')))
        }
      }
    },
    '/api/v1/alerts/status/{status}': {
      get: {
        tags: ['Alerts'],
        summary: 'List alerts by status',
        parameters: [{ in: 'path', name: 'status', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Alert')))
        }
      }
    },
    '/api/v1/alerts/{alertId}': {
      get: {
        tags: ['Alerts'],
        summary: 'Get alert by id',
        parameters: [{ in: 'path', name: 'alertId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Alert'))
        }
      }
    },
    '/api/v1/alerts/{alertId}/acknowledgment': {
      patch: {
        tags: ['Alerts'],
        summary: 'Acknowledge alert',
        parameters: [{ in: 'path', name: 'alertId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Alert'))
        }
      }
    },
    '/api/v1/alerts/{alertId}/closure': {
      patch: {
        tags: ['Alerts'],
        summary: 'Close alert',
        parameters: [{ in: 'path', name: 'alertId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Alert'))
        }
      }
    },
    '/api/v1/incidents/alert/{alertId}': {
      get: {
        tags: ['Incidents'],
        summary: 'List incidents by alert',
        parameters: [{ in: 'path', name: 'alertId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Incident')))
        }
      }
    },
    '/api/v1/incidents': {
      post: {
        tags: ['Incidents'],
        summary: 'Create incident',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateIncidentRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('Incident'))
        }
      }
    },
    '/api/v1/incidents/{incidentId}/acknowledgment': {
      patch: {
        tags: ['Incidents'],
        summary: 'Acknowledge incident',
        parameters: [{ in: 'path', name: 'incidentId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Incident'))
        }
      }
    },
    '/api/v1/incidents/{incidentId}/closure': {
      patch: {
        tags: ['Incidents'],
        summary: 'Close incident',
        parameters: [{ in: 'path', name: 'incidentId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Incident'))
        }
      }
    },
    '/api/v1/notifications/alert/{alertId}': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications by alert',
        parameters: [{ in: 'path', name: 'alertId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Notification')))
        }
      }
    },
    '/api/v1/notifications': {
      post: {
        tags: ['Notifications'],
        summary: 'Create notification',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateNotificationRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('Notification'))
        }
      }
    },
    '/api/v1/notifications/{notificationId}/send': {
      post: {
        tags: ['Notifications'],
        summary: 'Send notification now',
        parameters: [{ in: 'path', name: 'notificationId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Notification'))
        }
      }
    },
    '/api/v1/analytics/trips': {
      get: {
        tags: ['Dashboard'],
        summary: 'Trips summary',
        responses: {
          200: jsonResponse('OK', ref('AnalyticsTripsSummary'))
        }
      }
    },
    '/api/v1/analytics/trips/{id}': {
      get: {
        tags: ['Dashboard'],
        summary: 'Trip detail analytics',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('AnalyticsTripDetail'))
        }
      }
    },
    '/api/v1/analytics/alerts': {
      get: {
        tags: ['Dashboard'],
        summary: 'Alerts summary',
        responses: {
          200: jsonResponse('OK', ref('AnalyticsAlertsSummary'))
        }
      }
    },
    '/api/v1/analytics/incidents-by-month': {
      get: {
        tags: ['Dashboard'],
        summary: 'Incidents by month',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('IncidentsByMonthEntry')))
        }
      }
    },
    '/api/v1/fleet/devices': {
      get: {
        tags: ['Fleet Devices'],
        summary: 'List devices',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Device')))
        }
      },
      post: {
        tags: ['Fleet Devices'],
        summary: 'Create device',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateDeviceRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('Device'))
        }
      }
    },
    '/api/v1/fleet/devices/by-imei/{imei}': {
      get: {
        tags: ['Fleet Devices'],
        summary: 'Get device by IMEI',
        parameters: [{ in: 'path', name: 'imei', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Device'))
        }
      }
    },
    '/api/v1/fleet/devices/by-online/{online}': {
      get: {
        tags: ['Fleet Devices'],
        summary: 'List devices by online status',
        parameters: [{ in: 'path', name: 'online', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Device')))
        }
      }
    },
    '/api/v1/fleet/devices/{id}': {
      get: {
        tags: ['Fleet Devices'],
        summary: 'Get device by id',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Device'))
        }
      },
      put: {
        tags: ['Fleet Devices'],
        summary: 'Update device',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('UpdateDeviceRequest')
            }
          }
        },
        responses: {
          200: jsonResponse('OK', ref('Device'))
        }
      },
      delete: {
        tags: ['Fleet Devices'],
        summary: 'Delete device',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Device'))
        }
      }
    },
    '/api/v1/fleet/devices/{id}/firmware': {
      post: {
        tags: ['Fleet Devices'],
        summary: 'Update device firmware',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('UpdateFirmwareRequest')
            }
          }
        },
        responses: {
          200: jsonResponse('OK', ref('Device'))
        }
      }
    },
    '/api/v1/fleet/devices/{id}/online': {
      patch: {
        tags: ['Fleet Devices'],
        summary: 'Set device online status',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('SetOnlineStatusRequest')
            }
          }
        },
        responses: {
          200: jsonResponse('OK', ref('Device'))
        }
      }
    },
    '/api/v1/fleet/vehicles': {
      get: {
        tags: ['Fleet Vehicles'],
        summary: 'List vehicles',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Vehicle')))
        }
      },
      post: {
        tags: ['Fleet Vehicles'],
        summary: 'Create vehicle',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateVehicleRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('Vehicle'))
        }
      }
    },
    '/api/v1/fleet/vehicles/by-plate/{plate}': {
      get: {
        tags: ['Fleet Vehicles'],
        summary: 'Get vehicle by plate',
        parameters: [{ in: 'path', name: 'plate', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Vehicle'))
        }
      }
    },
    '/api/v1/fleet/vehicles/by-status/{status}': {
      get: {
        tags: ['Fleet Vehicles'],
        summary: 'List vehicles by status',
        parameters: [{ in: 'path', name: 'status', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Vehicle')))
        }
      }
    },
    '/api/v1/fleet/vehicles/by-type/{type}': {
      get: {
        tags: ['Fleet Vehicles'],
        summary: 'List vehicles by type',
        parameters: [{ in: 'path', name: 'type', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Vehicle')))
        }
      }
    },
    '/api/v1/fleet/vehicles/{id}': {
      get: {
        tags: ['Fleet Vehicles'],
        summary: 'Get vehicle by id',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Vehicle'))
        }
      },
      put: {
        tags: ['Fleet Vehicles'],
        summary: 'Update vehicle',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('UpdateVehicleRequest')
            }
          }
        },
        responses: {
          200: jsonResponse('OK', ref('Vehicle'))
        }
      },
      delete: {
        tags: ['Fleet Vehicles'],
        summary: 'Delete vehicle',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Vehicle'))
        }
      }
    },
    '/api/v1/fleet/vehicles/{id}/assign-device/{imei}': {
      post: {
        tags: ['Fleet Vehicles'],
        summary: 'Assign device to vehicle',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'imei', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: jsonResponse('OK', ref('Vehicle'))
        }
      }
    },
    '/api/v1/fleet/vehicles/{id}/unassign-device/{imei}': {
      post: {
        tags: ['Fleet Vehicles'],
        summary: 'Unassign device from vehicle',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'imei', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: jsonResponse('OK', ref('Vehicle'))
        }
      }
    },
    '/api/v1/fleet/vehicles/{id}/status': {
      patch: {
        tags: ['Fleet Vehicles'],
        summary: 'Change vehicle status',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('ChangeVehicleStatusRequest')
            }
          }
        },
        responses: {
          200: jsonResponse('OK', ref('Vehicle'))
        }
      }
    },
    '/api/v1/monitoring/sessions': {
      post: {
        tags: ['Monitoring'],
        summary: 'Create monitoring session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateSessionRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('MonitoringSession'))
        }
      }
    },
    '/api/v1/monitoring/sessions/active': {
      get: {
        tags: ['Monitoring'],
        summary: 'List active sessions',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('MonitoringSession')))
        }
      }
    },
    '/api/v1/monitoring/sessions/{sessionId}': {
      get: {
        tags: ['Monitoring'],
        summary: 'Get session by id',
        parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('MonitoringSession'))
        }
      },
      delete: {
        tags: ['Monitoring'],
        summary: 'Delete session',
        parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('MonitoringSession'))
        }
      }
    },
    '/api/v1/monitoring/sessions/{sessionId}/pause': {
      post: {
        tags: ['Monitoring'],
        summary: 'Pause session',
        parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('MonitoringSession'))
        }
      }
    },
    '/api/v1/monitoring/sessions/{sessionId}/end': {
      post: {
        tags: ['Monitoring'],
        summary: 'End session',
        parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('MonitoringSession'))
        }
      }
    },
    '/api/v1/monitoring/sessions/{sessionId}/resume': {
      post: {
        tags: ['Monitoring'],
        summary: 'Resume session',
        parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('MonitoringSession'))
        }
      }
    },
    '/api/v1/monitoring/sessions/trip/{tripId}': {
      get: {
        tags: ['Monitoring'],
        summary: 'Get session by trip',
        parameters: [{ in: 'path', name: 'tripId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('MonitoringSession'))
        }
      }
    },
    '/api/v1/telemetry': {
      post: {
        tags: ['Telemetry'],
        summary: 'Create telemetry record',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateTelemetryRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('TelemetryData'))
        }
      }
    },
    '/api/v1/telemetry/session/{sessionId}': {
      get: {
        tags: ['Telemetry'],
        summary: 'List telemetry by session',
        parameters: [{ in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('TelemetryData')))
        }
      }
    },
    '/api/v1/telemetry/{id}': {
      get: {
        tags: ['Telemetry'],
        summary: 'Get telemetry record by id',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('TelemetryData'))
        }
      },
      delete: {
        tags: ['Telemetry'],
        summary: 'Delete telemetry record',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('TelemetryData'))
        }
      }
    },
    '/api/v1/merchants': {
      get: {
        tags: ['Merchants'],
        summary: 'List merchants',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Merchant')))
        }
      },
      post: {
        tags: ['Merchants'],
        summary: 'Create merchant',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateMerchantRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('Merchant'))
        }
      }
    },
    '/api/v1/merchants/{id}': {
      get: {
        tags: ['Merchants'],
        summary: 'Get merchant by id',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Merchant'))
        }
      },
      put: {
        tags: ['Merchants'],
        summary: 'Update merchant',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('UpdateMerchantRequest')
            }
          }
        },
        responses: {
          200: jsonResponse('OK', ref('Merchant'))
        }
      },
      delete: {
        tags: ['Merchants'],
        summary: 'Delete merchant',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Merchant'))
        }
      }
    },
    '/api/v1/merchants/{id}/employee': {
      post: {
        tags: ['Merchants'],
        summary: 'Add employee to merchant',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('AddEmployeeRequest')
            }
          }
        },
        responses: {
          201: noContentResponse('Created')
        }
      }
    },
    '/api/v1/employees': {
      get: {
        tags: ['Employees'],
        summary: 'List employees',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Employee')))
        }
      }
    },
    '/api/v1/employees/merchants/{merchantId}': {
      get: {
        tags: ['Employees'],
        summary: 'List employees by merchant',
        parameters: [{ in: 'path', name: 'merchantId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Employee')))
        }
      }
    },
    '/api/v1/employees/{id}': {
      get: {
        tags: ['Employees'],
        summary: 'Get employee by id',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Employee'))
        }
      },
      delete: {
        tags: ['Employees'],
        summary: 'Delete employee',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Employee'))
        }
      }
    },
    '/api/v1/profiles': {
      get: {
        tags: ['Profiles'],
        summary: 'List profiles',
        responses: {
          200: jsonResponse('OK', arrayOf(ref('Profile')))
        }
      },
      post: {
        tags: ['Profiles'],
        summary: 'Create profile',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('CreateProfileRequest')
            }
          }
        },
        responses: {
          201: jsonResponse('Created', ref('Profile'))
        }
      }
    },
    '/api/v1/profiles/user/{userId}': {
      get: {
        tags: ['Profiles'],
        summary: 'Get profile by user id',
        parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Profile'))
        }
      }
    },
    '/api/v1/profiles/{id}': {
      get: {
        tags: ['Profiles'],
        summary: 'Get profile by id',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Profile'))
        }
      },
      put: {
        tags: ['Profiles'],
        summary: 'Update profile',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('UpdateProfileRequest')
            }
          }
        },
        responses: {
          200: jsonResponse('OK', ref('Profile'))
        }
      },
      delete: {
        tags: ['Profiles'],
        summary: 'Delete profile',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('OK', ref('Profile'))
        }
      }
    }
  },
  components: {
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Bad request' }
        }
      },
      SignInRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' }
        }
      },
      SignUpRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' }
        }
      },
      VerifyTokenRequest: {
        type: 'object',
        properties: {
          token: { type: 'string' }
        }
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' }
        }
      },
      LogoutRequest: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' }
        }
      },
      LogoutAllRequest: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        }
      },
      TokenPair: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' }
        }
      },
      Role: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          name: { type: 'string' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          email: { type: 'string' },
          roles: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      Trip: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          merchantId: { type: ['string', 'integer'], nullable: true },
          status: { type: 'string' },
          originPoint: ref('OriginPoint'),
          deliveryOrders: arrayOf(ref('DeliveryOrder'))
        }
      },
      CreateTripRequest: {
        type: 'object',
        additionalProperties: true
      },
      OriginPoint: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          name: { type: 'string' },
          address: { type: 'string', nullable: true },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      CreateOriginPointRequest: {
        type: 'object',
        additionalProperties: true
      },
      UpdateOriginPointRequest: {
        type: 'object',
        additionalProperties: true
      },
      DeliveryOrder: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          tripId: { type: ['string', 'integer'], nullable: true },
          clientEmail: { type: 'string', nullable: true },
          sequenceOrder: { type: 'integer', nullable: true },
          address: { type: 'string', nullable: true },
          arrivalAt: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', nullable: true },
          minHumidity: { type: 'number', nullable: true },
          maxHumidity: { type: 'number', nullable: true },
          minTemperature: { type: 'number', nullable: true },
          maxTemperature: { type: 'number', nullable: true },
          maxVibration: { type: 'number', nullable: true },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      CreateDeliveryOrderRequest: {
        type: 'object',
        additionalProperties: true
      },
      UpdateDeliveryOrderRequest: {
        type: 'object',
        additionalProperties: true
      },
      CreateAlertRequest: {
        type: 'object',
        additionalProperties: true
      },
      Alert: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          type: { type: 'string' },
          status: { type: 'string' },
          title: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true },
          updatedAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      CreateIncidentRequest: {
        type: 'object',
        additionalProperties: true
      },
      Incident: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          alertId: { type: ['string', 'integer'], nullable: true },
          status: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      CreateNotificationRequest: {
        type: 'object',
        additionalProperties: true
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          alertId: { type: ['string', 'integer'], nullable: true },
          channel: { type: 'string', nullable: true },
          sentAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      AnalyticsTripsSummary: {
        type: 'object',
        additionalProperties: true
      },
      AnalyticsTripDetail: {
        type: 'object',
        additionalProperties: true
      },
      AnalyticsAlertsSummary: {
        type: 'object',
        additionalProperties: true
      },
      IncidentsByMonthEntry: {
        type: 'object',
        additionalProperties: true
      },
      CreateDeviceRequest: {
        type: 'object',
        additionalProperties: true
      },
      UpdateDeviceRequest: {
        type: 'object',
        additionalProperties: true
      },
      UpdateFirmwareRequest: {
        type: 'object',
        properties: {
          firmware: { type: 'string' }
        }
      },
      SetOnlineStatusRequest: {
        type: 'object',
        properties: {
          online: { type: 'boolean' }
        }
      },
      Device: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          imei: { type: 'string' },
          firmware: { type: 'string' },
          online: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      CreateVehicleRequest: {
        type: 'object',
        additionalProperties: true
      },
      UpdateVehicleRequest: {
        type: 'object',
        additionalProperties: true
      },
      ChangeVehicleStatusRequest: {
        type: 'object',
        properties: {
          status: { type: 'string' }
        }
      },
      Vehicle: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          plate: { type: 'string' },
          type: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      CreateSessionRequest: {
        type: 'object',
        additionalProperties: true
      },
      MonitoringSession: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          tripId: { type: ['string', 'integer'], nullable: true },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time', nullable: true },
          endedAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      CreateTelemetryRequest: {
        type: 'object',
        additionalProperties: true
      },
      TelemetryData: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          sessionId: { type: ['string', 'integer'], nullable: true },
          timestamp: { type: 'string', format: 'date-time', nullable: true },
          temperature: { type: 'number', nullable: true },
          humidity: { type: 'number', nullable: true },
          vibration: { type: 'number', nullable: true }
        }
      },
      CreateMerchantRequest: {
        type: 'object',
        additionalProperties: true
      },
      UpdateMerchantRequest: {
        type: 'object',
        additionalProperties: true
      },
      AddEmployeeRequest: {
        type: 'object',
        properties: {
          userId: { type: ['string', 'integer'] }
        }
      },
      Merchant: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          name: { type: 'string' },
          contactEmail: { type: 'string' },
          fiscalAddress: { type: 'string' },
          ruc: { type: 'string' },
          isActive: { type: 'boolean' }
        }
      },
      Employee: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          merchantId: { type: ['string', 'integer'], nullable: true },
          userId: { type: ['string', 'integer'], nullable: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true },
          updatedAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      CreateProfileRequest: {
        type: 'object',
        additionalProperties: true
      },
      UpdateProfileRequest: {
        type: 'object',
        additionalProperties: true
      },
      Profile: {
        type: 'object',
        properties: {
          id: { type: ['string', 'integer'] },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          birthDate: { type: 'string', format: 'date', nullable: true },
          phoneNumber: { type: 'string', nullable: true },
          documentType: { type: 'string', nullable: true },
          document: { type: 'string', nullable: true },
          userId: { type: ['string', 'integer'] },
          createdAt: { type: 'string', format: 'date-time', nullable: true },
          updatedAt: { type: 'string', format: 'date-time', nullable: true }
        }
      }
    }
  }
};
