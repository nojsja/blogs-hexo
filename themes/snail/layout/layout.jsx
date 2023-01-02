import React from 'react';
import ReactHtmlParser from 'react-html-parser';

import Head from './_partial/head';
import Header from './_partial/header';
import Nav from './_partial/nav';

const Layout = (props) => {
  return (
    <html>
      <Head {...props} />
      <body>
        <Header {...props} />
        <Nav {...props} />
        <main>
          {
            ReactHtmlParser(props.body)
          }
        </main>
      </body>
    </html>
  );
};

export default Layout;