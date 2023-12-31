import { CheckoutSelectors, CheckoutService } from '@bigcommerce/checkout-sdk';
import classNames from 'classnames';
import React, { FunctionComponent, memo } from 'react';

import { TranslatedString, useLocale } from '@bigcommerce/checkout/locale';
import { CheckoutContextProps } from '@bigcommerce/checkout/payment-integration-api';
import { WalletButtonsContainerSkeleton } from '@bigcommerce/checkout/ui';


import { withCheckout } from '../checkout';

import { getSupportedMethodIds } from './getSupportedMethods';
import resolveCheckoutButton from './resolveCheckoutButton';
import CheckoutButtonV1Resolver from './WalletButtonV1Resolver';

interface CheckoutButtonContainerProps {
    isPaymentStepActive: boolean;
    checkEmbeddedSupport(methodIds: string[]): void;
    onUnhandledError(error: Error): void;
    onWalletButtonClick(methodId: string): void;
}

interface WithCheckoutCheckoutButtonContainerProps {
    availableMethodIds: string[];
    checkoutState: CheckoutSelectors;
    checkoutService: CheckoutService;
    isLoading: boolean;
    initializedMethodIds: string[];
}

const paypalCommerceIds = [
    'paypalcommerce',
    'paypalcommercecredit',
    'paypalcommercevenmo',
];

const isPayPalCommerce = (methodId: string): boolean => paypalCommerceIds.includes(methodId);

const CheckoutButtonContainer: FunctionComponent<CheckoutButtonContainerProps & WithCheckoutCheckoutButtonContainerProps> = (
    {
        availableMethodIds,
        checkoutService,
        checkoutState,
        checkEmbeddedSupport,
        isLoading,
        isPaymentStepActive,
        initializedMethodIds,
        onUnhandledError,
        onWalletButtonClick,
    }) => {
    const { language } = useLocale();

    const methodIds = isLoading ? availableMethodIds : initializedMethodIds;

    try {
        checkEmbeddedSupport(methodIds);
    } catch (error) {
        return null;
    }

    const renderButtons = () => availableMethodIds.map((methodId) => {
        if (isPaymentStepActive && isPayPalCommerce(methodId)) {
            return null;
        }

        const ResolvedCheckoutButton = resolveCheckoutButton({ id: methodId });

        if (!ResolvedCheckoutButton) {
            return <CheckoutButtonV1Resolver
                deinitialize={checkoutService.deinitializeCustomer}
                initialize={checkoutService.initializeCustomer}
                isShowingWalletButtonsOnTop={true}
                key={methodId}
                methodId={methodId}
                onError={onUnhandledError}
                onClick={onWalletButtonClick}
            />
        }

        return <ResolvedCheckoutButton
                    checkoutService={checkoutService}
                    checkoutState={checkoutState}
                    containerId={`${methodId}CheckoutButton`}
                    key={methodId}
                    language={language}
                    methodId={methodId}
                    onUnhandledError={onUnhandledError}
                    onWalletButtonClick={onWalletButtonClick}
                />;
    });

    return (
        <div className='checkout-button-container'
             style={ isPaymentStepActive ? { position: 'absolute', left: '0', top: '-100%' } : undefined }
        >
            <p>
                <TranslatedString id="remote.start_with_text" />
            </p>
            <div className={classNames({
                'checkout-buttons--1': methodIds.length === 1,
                'checkout-buttons--2': methodIds.length === 2,
                'checkout-buttons--3': methodIds.length === 3,
                'checkout-buttons--4': methodIds.length === 4,
                'checkout-buttons--5': methodIds.length === 5,
                'checkout-buttons--n': methodIds.length > 5,
            })}>
                <WalletButtonsContainerSkeleton buttonsCount={methodIds.length} isLoading={isLoading}>
                    <div className="checkoutRemote">
                        {renderButtons()}
                    </div>
                </WalletButtonsContainerSkeleton>
            </div>
            <div className='checkout-separator'><span><TranslatedString id='remote.or_text' /></span></div>
        </div>
    );
};

function mapToCheckoutButtonContainerProps({
    checkoutState,
    checkoutService,
}: CheckoutContextProps): WithCheckoutCheckoutButtonContainerProps | null {
    const {
        data: {
            getConfig,
            getCustomer,
            isPaymentDataRequired,
        },
        statuses: {
            isInitializedCustomer,
        },
        errors: {
            getInitializeCustomerError,
        }
     } = checkoutState;
    const config = getConfig();
    const availableMethodIds = getSupportedMethodIds(config?.checkoutSettings.remoteCheckoutProviders ?? []);
    const customer = getCustomer();

    if (!isPaymentDataRequired()) {
        return null;
    }

    if (!config || availableMethodIds.length === 0 || !customer?.isGuest) {
        return null;
    }

    const isLoading = availableMethodIds.filter(
        (methodId) => Boolean(getInitializeCustomerError(methodId)) || isInitializedCustomer(methodId)
    ).length !== availableMethodIds.length;
    const initializedMethodIds = availableMethodIds.filter((methodId) => isInitializedCustomer(methodId));

    return {
        checkoutService,
        checkoutState,
        availableMethodIds,
        initializedMethodIds,
        isLoading,
    }
}

export default memo(withCheckout(mapToCheckoutButtonContainerProps)(CheckoutButtonContainer));
