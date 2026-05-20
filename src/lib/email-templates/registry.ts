import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as orderConfirmationClient } from './order-confirmation-client'
import { template as orderNewRestaurant } from './order-new-restaurant'
import { template as orderAcceptedClient } from './order-accepted-client'
import { template as orderRejectedClient } from './order-rejected-client'
import { template as orderReadyDrivers } from './order-ready-drivers'
import { template as orderPickedUpClient } from './order-picked-up-client'
import { template as orderDeliveredClient } from './order-delivered-client'
import { template as restaurantApproved } from './restaurant-approved'
import { template as restaurantRejected } from './restaurant-rejected'
import { template as driverApproved } from './driver-approved'
import { template as driverRejected } from './driver-rejected'

export const TEMPLATES: Record<string, TemplateEntry> = {
  order_confirmation_client: orderConfirmationClient,
  order_new_restaurant: orderNewRestaurant,
  order_accepted_client: orderAcceptedClient,
  order_rejected_client: orderRejectedClient,
  order_ready_drivers: orderReadyDrivers,
  order_picked_up_client: orderPickedUpClient,
  order_delivered_client: orderDeliveredClient,
  restaurant_approved: restaurantApproved,
  restaurant_rejected: restaurantRejected,
  driver_approved: driverApproved,
  driver_rejected: driverRejected,
}
